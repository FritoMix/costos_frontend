import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { HttpErrorResponse } from '@angular/common/http';

import type { EstadoFormula } from '../../core/modelos/formula.model';
import type { OrdenBodega } from '../../core/modelos/bodega.model';
import type { Producto } from '../../core/modelos/catalogos.model';
import { BodegaService } from '../../core/servicios/bodega.service';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
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
            Define la mezcla de papa de cada orden y sigue su avance.
          </p>
        </div>
        <div class="flex items-center gap-3">
          @if (ultimaActualizacion()) {
            <span class="hidden sm:block text-xs font-semibold text-slate-400">
              Actualizado {{ ultimaActualizacion() | date: 'HH:mm:ss' }}
            </span>
          }
          <app-boton variante="secundario" [cargando]="cargando()" (click)="cargar()">
            Actualizar
          </app-boton>
        </div>
      </header>

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
    </div>
  `,
})
export class FormulaProduccionPage {
  private readonly bodega = inject(BodegaService);
  private readonly catalogos = inject(CatalogosService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly ordenes = signal<OrdenBodega[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly ultimaActualizacion = signal<Date | null>(null);
  protected readonly filtroActivo = signal<string>('todas');

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
    this.catalogos.listarProductos().subscribe({
      next: (productos) => this.productos.set(productos),
      error: () => this.productos.set([]),
    });
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

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
