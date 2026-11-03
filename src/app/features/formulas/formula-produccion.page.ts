import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { HttpErrorResponse } from '@angular/common/http';

import type { EstadoFormula } from '../../core/modelos/formula.model';
import type { FormulaPapa } from '../../core/modelos/formula-papa.model';
import type { OrdenBodega } from '../../core/modelos/bodega.model';
import type { Producto } from '../../core/modelos/catalogos.model';
import { BodegaService } from '../../core/servicios/bodega.service';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { FormulasPapaService } from '../../core/servicios/formulas-papa.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { ConfirmarComponent } from '../../ui/confirmar.component';
import { EstadoVacioComponent } from '../../ui/estado-vacio.component';
import { EtiquetaEstadoComponent } from '../../ui/etiqueta-estado.component';

interface BadgeFormula {
  texto: string;
  clases: string;
}

const BADGES_FORMULA: Record<EstadoFormula, BadgeFormula> = {
  sin_formula: { texto: 'Por definir', clases: 'bg-amber-50 text-amber-800 ring-amber-500/20' },
  lista: { texto: 'Lista', clases: 'bg-emerald-50 text-emerald-800 ring-emerald-500/20' },
  en_produccion: { texto: 'Congelada', clases: 'bg-sky-50 text-sky-800 ring-sky-500/20' },
  finalizada: { texto: 'Finalizada', clases: 'bg-calido-100 text-stone-700 ring-calido-300/30' },
  cancelada: { texto: 'Cancelada', clases: 'bg-rose-50 text-rose-700 ring-rose-500/20' },
  no_aplica: { texto: 'No aplica', clases: 'bg-calido-100 text-stone-600 ring-calido-300/30' },
};

/**
 * Bandeja de Bodega: órdenes con el estado de su fórmula y el avance.
 *
 * Una sola lista, sin duplicar la del supervisor: al tocar una orden se abre
 * el editor de la mezcla en /formula-produccion/ordenes/:id.
 */
@Component({
  selector: 'app-formula-produccion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    DecimalPipe,
    DatePipe,
    BotonComponent,
    CargandoComponent,
    ConfirmarComponent,
    EstadoVacioComponent,
    EtiquetaEstadoComponent,
  ],
  template: `
    <div class="space-y-6" data-testid="formula-ordenes-bandeja">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Fórmula de producción
          </h1>
          <p class="mt-1 text-sm text-slate-500 font-medium">
            Fórmulas activas por producto y mezcla de cada orden, con su avance.
          </p>
        </div>
        <div class="flex items-center gap-3">
          @if (ultimaActualizacion()) {
            <span class="hidden sm:block text-xs font-semibold text-slate-400">
              Actualizado {{ ultimaActualizacion() | date: 'HH:mm:ss' }}
            </span>
          }
          <app-boton
            variante="secundario"
            [cargando]="seccion() === 'formulas' ? cargandoFormulas() : cargando()"
            (click)="refrescar()"
          >
            Actualizar
          </app-boton>
        </div>
      </header>

      <!-- Secciones del módulo -->
      <div
        class="flex flex-wrap items-center gap-2 rounded-2xl border border-sky-100/90 bg-white p-1.5 shadow-2xs"
      >
        <button
          type="button"
          class="rounded-xl px-4 py-2 text-xs font-bold tracking-tight transition-all duration-150 sm:text-sm"
          [class]="seccion() === 'formulas'
            ? 'bg-gradient-to-r from-sky-500 to-marca-600 text-white shadow-sm'
            : 'text-slate-600 hover:bg-sky-50 hover:text-sky-700'"
          data-testid="seccion-formulas"
          (click)="cambiarSeccion('formulas')"
        >
          Fórmulas de producto
        </button>
        <button
          type="button"
          class="rounded-xl px-4 py-2 text-xs font-bold tracking-tight transition-all duration-150 sm:text-sm"
          [class]="seccion() === 'ordenes'
            ? 'bg-gradient-to-r from-sky-500 to-marca-600 text-white shadow-sm'
            : 'text-slate-600 hover:bg-sky-50 hover:text-sky-700'"
          data-testid="seccion-ordenes"
          (click)="cambiarSeccion('ordenes')"
        >
          Órdenes
        </button>
      </div>

      @if (seccion() === 'formulas') {
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="max-w-2xl text-sm font-medium text-slate-500">
            Una fórmula activa por producto. Al crear una orden, el supervisor ve la activa y la
            orden nace con esa mezcla.
          </p>
          <a
            routerLink="/formula-produccion/formulas/nueva"
            [queryParams]="{ seccion: 'formulas' }"
          >
            <app-boton variante="primario" testId="nueva-formula">+ Nueva fórmula</app-boton>
          </a>
        </div>

        @if (cargandoFormulas()) {
          <app-cargando texto="Consultando fórmulas…" />
        } @else if (errorFormulas()) {
          <div class="rounded-3xl border border-rose-200 bg-rose-50/60 p-6 text-center">
            <p class="text-sm font-bold text-rose-800">{{ errorFormulas() }}</p>
            <div class="mt-3 flex justify-center">
              <app-boton variante="secundario" (click)="cargarFormulas()">Reintentar</app-boton>
            </div>
          </div>
        } @else if (formulas().length === 0) {
          <div class="rounded-3xl border border-sky-100/90 bg-white/85 shadow-xs">
            <app-estado-vacio
              titulo="Todavía no hay fórmulas"
              descripcion="Crea la primera con las referencias de papa de Bodega y actívala para que las órdenes nuevas la apliquen solas."
            />
            <div class="flex justify-center pb-6">
              <a
                routerLink="/formula-produccion/formulas/nueva"
                [queryParams]="{ seccion: 'formulas' }"
              >
                <app-boton variante="primario">+ Nueva fórmula</app-boton>
              </a>
            </div>
          </div>
        } @else {
          <div class="grid gap-4 lg:grid-cols-2">
            @for (formula of formulas(); track formula.id) {
              <div
                class="rounded-3xl border bg-white/90 p-5 shadow-xs transition-all duration-200"
                [class]="formula.activa
                  ? 'border-emerald-300 ring-2 ring-emerald-200/60'
                  : 'border-sky-100/90'"
                [attr.data-testid]="'formula-papa-' + formula.id"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-base font-extrabold text-slate-900">{{ formula.nombre }}</p>
                    <p class="text-xs font-semibold text-slate-500">
                      {{ formula.producto.nombre_comercial }}
                    </p>
                  </div>
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset"
                    [class]="formula.activa
                      ? 'bg-emerald-50 text-emerald-800 ring-emerald-500/20'
                      : 'bg-calido-100 text-stone-600 ring-calido-300/30'"
                  >
                    <span class="h-1.5 w-1.5 rounded-full bg-current opacity-80"></span>
                    {{ formula.activa ? 'Activa' : 'Inactiva' }}
                  </span>
                </div>

                <div class="mt-3 flex flex-wrap gap-1.5">
                  @for (fila of formula.referencias; track fila.referencia_id) {
                    <span
                      class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600"
                    >
                      {{ fila.nombre }} · {{ fila.bultos_por_tanda }} bts
                    </span>
                  }
                </div>

                <p class="mt-3 text-xs font-semibold text-slate-500">
                  {{ formula.total_bultos_por_tanda }} bultos/tanda ·
                  {{ formula.total_kg_crudos | number: '1.0-2' }} kg crudos ·
                  {{ formula.total_kg_fritos_estimados | number: '1.0-2' }} kg fritos
                </p>

                <div class="mt-4 flex flex-wrap items-center gap-2">
                  <a
                    [routerLink]="['/formula-produccion', 'formulas', formula.id]"
                    [queryParams]="{ seccion: 'formulas' }"
                  >
                    <app-boton variante="secundario" tamano="pequeno">Editar</app-boton>
                  </a>
                  @if (formula.activa) {
                    <app-boton
                      variante="secundario"
                      tamano="pequeno"
                      [cargando]="cambiandoEstado() === formula.id"
                      [testId]="'formula-papa-desactivar-' + formula.id"
                      (click)="desactivarFormula(formula)"
                    >
                      Desactivar
                    </app-boton>
                  } @else {
                    <app-boton
                      variante="acento"
                      tamano="pequeno"
                      [cargando]="cambiandoEstado() === formula.id"
                      [testId]="'formula-papa-activar-' + formula.id"
                      (click)="activarFormula(formula)"
                    >
                      Activar
                    </app-boton>
                    <app-boton
                      variante="texto"
                      tamano="pequeno"
                      (click)="pedirEliminarFormula(formula)"
                    >
                      Eliminar
                    </app-boton>
                  }
                </div>
              </div>
            }
          </div>
        }
      } @else {

      <!-- Contadores clicables -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        @for (contador of contadores(); track contador.clave) {
          <button
            type="button"
            class="flex items-center justify-between rounded-3xl border bg-white/85 px-5 py-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            [class]="filtroActivo() === contador.clave
              ? 'border-sky-400 ring-2 ring-sky-300/60'
              : 'border-sky-100/90'"
            (click)="aplicarContador(contador.clave)"
          >
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {{ contador.titulo }}
              </p>
              <p class="mt-1 font-mono text-2xl font-black tabular-nums" [class]="contador.clases">
                {{ contador.total }}
              </p>
            </div>
            <span class="text-2xl">{{ contador.icono }}</span>
          </button>
        }
      </div>

      <!-- Filtros -->
      <section class="rounded-3xl border border-sky-100/90 bg-white/85 p-5 shadow-xs">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label class="block">
            <span class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Desde</span>
            <input
              type="date"
              [(ngModel)]="filtroFechaDesde"
              (change)="cargar()"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Hasta</span>
            <input
              type="date"
              [(ngModel)]="filtroFechaHasta"
              (change)="cargar()"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Estado</span>
            <select
              [(ngModel)]="filtroEstado"
              (change)="cargar()"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
            >
              <option value="">Todas</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_produccion">En producción</option>
              <option value="finalizada">Finalizada</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Producto</span>
            <select
              [(ngModel)]="filtroProductoId"
              (change)="cargar()"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
            >
              <option value="">Todos</option>
              @for (producto of productos(); track producto.id) {
                <option [value]="producto.id">{{ producto.nombre_comercial }}</option>
              }
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Destino</span>
            <select
              [(ngModel)]="filtroDestino"
              (change)="cargar()"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
            >
              <option value="">Todos</option>
              <option value="nacional">Nacional</option>
              <option value="exportacion">Exportación</option>
            </select>
          </label>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          @for (chip of chips; track chip.clave) {
            <button
              type="button"
              class="rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200"
              [class]="filtroActivo() === chip.clave
                ? 'bg-gradient-to-r from-sky-500 to-marca-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-700'"
              (click)="aplicarContador(chip.clave)"
            >
              {{ chip.texto }}
            </button>
          }
          <label class="ml-auto inline-flex items-center gap-2 text-xs font-bold text-slate-500">
            <input
              type="checkbox"
              [(ngModel)]="filtroSoloSinFormula"
              (change)="cargar()"
              class="h-4 w-4 rounded border-slate-300 text-sky-600"
            />
            Solo sin fórmula
          </label>
        </div>
      </section>

      @if (cargando()) {
        <app-cargando texto="Consultando órdenes…" />
      } @else if (error()) {
        <div class="rounded-3xl border border-rose-200 bg-rose-50/60 p-6 text-center">
          <p class="text-sm font-bold text-rose-800">{{ error() }}</p>
          <div class="mt-3 flex justify-center">
            <app-boton variante="secundario" (click)="cargar()">Reintentar</app-boton>
          </div>
        </div>
      } @else if (ordenes().length === 0) {
        <div class="rounded-3xl border border-sky-100/90 bg-white/85 shadow-xs">
          <app-estado-vacio
            titulo="No hay órdenes con estos filtros"
            descripcion="Prueba con otro rango de fechas o limpia los filtros para ver todas las órdenes."
          />
          <div class="flex justify-center pb-6">
            <app-boton variante="secundario" (click)="limpiarFiltros()">Limpiar filtros</app-boton>
          </div>
        </div>
      } @else {
        <!-- Tabla de escritorio -->
        <div class="hidden overflow-hidden rounded-3xl border border-sky-100/90 bg-white/85 shadow-xs md:block">
          <div class="overflow-x-auto">
            <table class="w-full min-w-225 text-left text-sm">
              <thead class="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th class="px-5 py-3">Orden</th>
                  <th class="px-3 py-3">Estado</th>
                  <th class="px-3 py-3">Producto</th>
                  <th class="px-3 py-3">Cantidad</th>
                  <th class="px-3 py-3">Horas / horno</th>
                  <th class="px-3 py-3">Fórmula</th>
                  <th class="px-5 py-3">Avance</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (orden of ordenes(); track orden.id) {
                  <tr
                    class="cursor-pointer transition-colors duration-150 hover:bg-sky-50/40"
                    [attr.data-testid]="'bodega-orden-' + orden.id"
                    (click)="abrir(orden)"
                  >
                    <td class="px-5 py-3.5">
                      <p class="font-mono font-bold text-slate-900">#{{ orden.numero_orden }}</p>
                      <p class="text-[11px] font-medium text-slate-400">{{ orden.fecha | date: 'dd/MM/yyyy' }}</p>
                    </td>
                    <td class="px-3 py-3.5">
                      <app-etiqueta-estado
                        [estado]="orden.estado"
                        [texto]="orden.estado_etiqueta"
                      />
                    </td>
                    <td class="px-3 py-3.5">
                      <p class="font-bold text-slate-800">{{ orden.producto.nombre_comercial }}</p>
                      <p class="text-[11px] font-medium text-slate-400">{{ orden.categoria.nombre }}</p>
                    </td>
                    <td class="px-3 py-3.5">
                      <p class="font-mono font-bold text-slate-800">
                        {{ orden.cantidad_programada | number: '1.0-2' }}
                        {{ orden.unidad_solicitada === 'kg' ? 'kg' : 'canastillas' }}
                      </p>
                    </td>
                    <td class="px-3 py-3.5">
                      <p class="font-bold text-slate-700">
                        {{ orden.horas_produccion }} h · {{ orden.horno.nombre }}
                      </p>
                      <p class="text-[11px] font-medium text-slate-400">{{ orden.turno.nombre }}</p>
                    </td>
                    <td class="px-3 py-3.5">
                      <span
                        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset"
                        [class]="badge(orden.formula_estado).clases"
                      >
                        <span class="h-1.5 w-1.5 rounded-full bg-current opacity-80"></span>
                        {{ badge(orden.formula_estado).texto }}
                      </span>
                    </td>
                    <td class="px-5 py-3.5">
                      @if (orden.total_bultos_planificados) {
                        <p class="font-mono text-xs font-bold text-slate-700">
                          {{ orden.total_bultos_producidos | number: '1.0-0' }} /
                          {{ orden.total_bultos_planificados }} bultos
                        </p>
                        <div class="mt-1 h-2 w-40 overflow-hidden rounded-full bg-slate-100">
                          <div
                            class="h-full rounded-full bg-gradient-to-r from-sky-400 to-marca-600"
                            [style.width.%]="min(100, orden.avance_bultos_porcentaje ?? 0)"
                          ></div>
                        </div>
                        <p class="mt-1 text-[11px] font-semibold text-slate-400">
                          {{ orden.tandas_registradas }} / {{ orden.tandas_programadas ?? '—' }} tandas
                        </p>
                      } @else {
                        <span class="text-xs font-bold text-slate-300">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tarjetas en móvil -->
        <div class="space-y-3 md:hidden">
          @for (orden of ordenes(); track orden.id) {
            <a
              [routerLink]="['/formula-produccion/ordenes', orden.id]"
              class="block rounded-3xl border border-sky-100/90 bg-white/90 p-5 shadow-xs transition-all duration-200 active:scale-[0.99]"
              [attr.data-testid]="'bodega-orden-' + orden.id"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-mono text-xs font-bold text-slate-500">#{{ orden.numero_orden }}</p>
                  <p class="mt-0.5 text-base font-extrabold text-slate-900">
                    {{ orden.producto.nombre_comercial }}
                  </p>
                  <p class="text-xs font-medium text-slate-400">
                    {{ orden.fecha | date: 'dd/MM/yyyy' }} · {{ orden.horno.nombre }}
                  </p>
                </div>
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset"
                  [class]="badge(orden.formula_estado).clases"
                >
                  {{ badge(orden.formula_estado).texto }}
                </span>
              </div>
              <div class="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>
                  {{ orden.cantidad_programada | number: '1.0-2' }}
                  {{ orden.unidad_solicitada === 'kg' ? 'kg' : 'canastillas' }}
                  · {{ orden.horas_produccion }} h
                </span>
                @if (orden.total_bultos_planificados) {
                  <span class="font-mono">
                    {{ orden.total_bultos_producidos | number: '1.0-0' }} /
                    {{ orden.total_bultos_planificados }} bultos
                  </span>
                } @else {
                  <span class="font-bold text-amber-700">Definir fórmula</span>
                }
              </div>
            </a>
          }
        </div>
      }
      }
    </div>

    <app-confirmar
      [abierto]="formulaEliminar() !== null"
      titulo="Eliminar la fórmula"
      [mensaje]="mensajeEliminar()"
      textoConfirmar="Sí, eliminar"
      [peligroso]="true"
      (confirmado)="eliminarFormula()"
      (cancelado)="formulaEliminar.set(null)"
    />
  `,
})
export class FormulaProduccionPage {
  private readonly bodega = inject(BodegaService);
  private readonly catalogos = inject(CatalogosService);
  private readonly formulasPapa = inject(FormulasPapaService);
  private readonly avisos = inject(NotificacionesService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly ordenes = signal<OrdenBodega[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly ultimaActualizacion = signal<Date | null>(null);
  protected readonly filtroActivo = signal<string>('todas');
  protected readonly seccion = signal<'formulas' | 'ordenes'>('formulas');
  protected readonly formulas = signal<FormulaPapa[]>([]);
  protected readonly cargandoFormulas = signal(true);
  protected readonly errorFormulas = signal<string | null>(null);
  protected readonly cambiandoEstado = signal<number | null>(null);
  protected readonly formulaEliminar = signal<FormulaPapa | null>(null);

  protected filtroFechaDesde = '';
  protected filtroFechaHasta = '';
  protected filtroEstado = '';
  protected filtroProductoId = '';
  protected filtroDestino = '';
  protected filtroSoloSinFormula = false;

  protected readonly chips = [
    { clave: 'todas', texto: 'Todas' },
    { clave: 'sin_formula', texto: 'Pendientes de fórmula' },
    { clave: 'con_formula', texto: 'Con fórmula' },
    { clave: 'en_produccion', texto: 'En producción' },
  ];

  protected readonly contadores = computed(() => {
    const ordenes = this.ordenes();
    return [
      {
        clave: 'sin_formula',
        titulo: 'Pendientes de fórmula',
        total: ordenes.filter((orden) => orden.formula_estado === 'sin_formula').length,
        icono: '📝',
        clases: 'text-amber-600',
      },
      {
        clave: 'con_formula',
        titulo: 'Listas para producir',
        total: ordenes.filter((orden) => orden.formula_estado === 'lista').length,
        icono: '✅',
        clases: 'text-emerald-600',
      },
      {
        clave: 'en_produccion',
        titulo: 'En producción',
        total: ordenes.filter((orden) => orden.estado === 'en_produccion').length,
        icono: '♨️',
        clases: 'text-sky-600',
      },
    ];
  });

  constructor() {
    // Los filtros se reflejan en la URL para poder volver a la misma vista.
    const parametros = this.ruta.snapshot.queryParamMap;
    this.filtroFechaDesde = parametros.get('fecha_desde') ?? '';
    this.filtroFechaHasta = parametros.get('fecha_hasta') ?? '';
    this.filtroEstado = parametros.get('estado') ?? '';
    this.filtroProductoId = parametros.get('producto_id') ?? '';
    this.filtroDestino = parametros.get('destino') ?? '';
    this.filtroSoloSinFormula = parametros.get('solo_sin_formula') === 'true';
    this.filtroActivo.set(parametros.get('vista') ?? this.vistaPorDefecto());
    this.seccion.set(parametros.get('seccion') === 'ordenes' ? 'ordenes' : 'formulas');

    this.catalogos.listarProductos().subscribe({
      next: (productos) => this.productos.set(productos),
      error: () => this.productos.set([]),
    });
    this.cargarFormulas();
    this.cargar();
  }

  protected refrescar(): void {
    if (this.seccion() === 'formulas') {
      this.cargarFormulas();
    } else {
      this.cargar();
    }
  }

  protected cambiarSeccion(seccion: 'formulas' | 'ordenes'): void {
    this.seccion.set(seccion);
    void this.router.navigate([], {
      relativeTo: this.ruta,
      replaceUrl: true,
      queryParams: { seccion: seccion === 'ordenes' ? 'ordenes' : null },
      queryParamsHandling: 'merge',
    });
    if (seccion === 'formulas') {
      this.cargarFormulas();
    } else {
      this.cargar();
    }
  }

  protected cargarFormulas(): void {
    this.cargandoFormulas.set(true);
    this.errorFormulas.set(null);
    this.formulasPapa.listar().subscribe({
      next: (formulas) => {
        this.formulas.set(formulas);
        this.cargandoFormulas.set(false);
      },
      error: (respuesta: HttpErrorResponse) => {
        this.cargandoFormulas.set(false);
        this.errorFormulas.set(
          respuesta.status === 403
            ? 'No tienes permiso para ver las fórmulas de Bodega.'
            : 'No se pudieron cargar las fórmulas. Revisa la conexión e intenta de nuevo.',
        );
      },
    });
  }

  protected activarFormula(formula: FormulaPapa): void {
    this.cambiandoEstado.set(formula.id);
    this.formulasPapa.activar(formula.id).subscribe({
      next: (activada) => {
        this.cambiandoEstado.set(null);
        this.avisos.exito(
          `Fórmula activada para ${activada.producto.nombre_comercial}. Las órdenes nuevas la aplicarán.`,
        );
        this.cargarFormulas();
      },
      error: () => this.cambiandoEstado.set(null),
    });
  }

  protected desactivarFormula(formula: FormulaPapa): void {
    this.cambiandoEstado.set(formula.id);
    this.formulasPapa.desactivar(formula.id).subscribe({
      next: () => {
        this.cambiandoEstado.set(null);
        this.avisos.exito('Fórmula desactivada. Las órdenes nuevas pedirán a Bodega.');
        this.cargarFormulas();
      },
      error: () => this.cambiandoEstado.set(null),
    });
  }

  protected pedirEliminarFormula(formula: FormulaPapa): void {
    this.formulaEliminar.set(formula);
  }

  protected eliminarFormula(): void {
    const formula = this.formulaEliminar();
    if (!formula) {
      return;
    }
    this.formulasPapa.eliminar(formula.id).subscribe({
      next: () => {
        this.formulaEliminar.set(null);
        this.avisos.exito('Fórmula eliminada del catálogo.');
        this.cargarFormulas();
      },
      error: () => this.formulaEliminar.set(null),
    });
  }

  protected mensajeEliminar(): string {
    const nombre = this.formulaEliminar()?.nombre ?? '';
    return `Se eliminará "${nombre}" del catálogo. Las órdenes ya creadas conservan su mezcla.`;
  }

  /** Vista activa cuando la URL no la trae: se deduce de los filtros. */
  private vistaPorDefecto(): string {
    if (this.filtroSoloSinFormula) {
      return 'sin_formula';
    }
    if (this.filtroEstado === 'en_produccion') {
      return 'en_produccion';
    }
    return 'todas';
  }

  /** Guarda los filtros en la URL sin recargar la pantalla. */
  private sincronizarUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.ruta,
      replaceUrl: true,
      queryParams: {
        fecha_desde: this.filtroFechaDesde || null,
        fecha_hasta: this.filtroFechaHasta || null,
        estado: this.filtroEstado || null,
        producto_id: this.filtroProductoId || null,
        destino: this.filtroDestino || null,
        solo_sin_formula: this.filtroSoloSinFormula ? 'true' : null,
        vista: this.filtroActivo() === 'todas' ? null : this.filtroActivo(),
        seccion: this.seccion() === 'ordenes' ? 'ordenes' : null,
      },
    });
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.sincronizarUrl();

    const filtros = {
      fecha_desde: this.filtroFechaDesde || undefined,
      fecha_hasta: this.filtroFechaHasta || undefined,
      estado: this.filtroEstado || undefined,
      producto_id: this.filtroProductoId ? Number(this.filtroProductoId) : undefined,
      destino: this.filtroDestino || undefined,
      solo_sin_formula: this.filtroSoloSinFormula || undefined,
    };

    this.bodega.listarOrdenes(filtros).subscribe({
      next: (ordenes) => {
        this.ordenes.set(ordenes);
        this.ultimaActualizacion.set(new Date());
        this.cargando.set(false);
      },
      error: (respuesta: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(
          respuesta.status === 403
            ? 'No tienes permiso para ver las órdenes de Bodega.'
            : 'No se pudieron cargar las órdenes. Revisa la conexión e intenta de nuevo.',
        );
      },
    });
  }

  protected aplicarContador(clave: string): void {
    this.filtroActivo.set(clave);
    switch (clave) {
      case 'sin_formula':
        this.filtroSoloSinFormula = true;
        this.filtroEstado = 'pendiente';
        break;
      case 'con_formula':
        this.filtroSoloSinFormula = false;
        this.filtroEstado = '';
        break;
      case 'en_produccion':
        this.filtroSoloSinFormula = false;
        this.filtroEstado = 'en_produccion';
        break;
      default:
        this.filtroSoloSinFormula = false;
        this.filtroEstado = '';
    }
    this.cargar();
  }

  protected limpiarFiltros(): void {
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.filtroEstado = '';
    this.filtroProductoId = '';
    this.filtroDestino = '';
    this.filtroSoloSinFormula = false;
    this.filtroActivo.set('todas');
    this.cargar();
  }

  protected abrir(orden: OrdenBodega): void {
    void this.router.navigate(['/formula-produccion/ordenes', orden.id]);
  }

  protected badge(estado: EstadoFormula): BadgeFormula {
    return BADGES_FORMULA[estado] ?? BADGES_FORMULA.no_aplica;
  }

  protected min(a: number, b: number): number {
    return Math.min(a, b);
  }
}
