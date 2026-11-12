import { DecimalPipe } from '@angular/common';
import type { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import type { ReferenciaPapa } from '../../core/modelos/bodega.model';
import type { Horno, Producto } from '../../core/modelos/catalogos.model';
import type { FormulaPapa, FormulaPapaGuardar } from '../../core/modelos/formula-papa.model';
import { BodegaService } from '../../core/servicios/bodega.service';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { FormulasPapaService } from '../../core/servicios/formulas-papa.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import {
  calcularKgCrudosPreview,
  calcularKgFritosPreview,
} from '../../core/utilidades/calculos-produccion';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { ConfirmarComponent } from '../../ui/confirmar.component';

interface FilaPlantilla {
  referencia_papa_id: number | null;
  bultos_por_tanda: number;
}

/**
 * Crear o editar una fórmula reutilizable de Bodega.
 *
 * La mezcla se arma con las referencias de papa del catálogo de Bodega y se
 * activa por producto. Las órdenes ya creadas conservan su copia: editar la
 * plantilla solo cambia las órdenes nuevas.
 */
@Component({
  selector: 'app-formula-papa-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    DecimalPipe,
    BotonComponent,
    CargandoComponent,
    ConfirmarComponent,
  ],
  template: `
    <div class="mx-auto max-w-4xl space-y-8 sm:space-y-10" data-testid="formula-papa-form">
      <header class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <a
            routerLink="/formula-produccion"
            [queryParams]="{ seccion: 'formulas' }"
            class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-900 mb-2"
          >
            ← Volver a Fórmula de producción
          </a>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {{ id() ? 'Editar fórmula' : 'Nueva fórmula' }}
          </h1>
          <p class="mt-1 text-sm text-slate-500 font-medium">
            Mezcla reutilizable de un producto. Al activarla, las órdenes nuevas la aplican solas.
          </p>
        </div>
        @if (formula(); as actual) {
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 ring-inset shadow-2xs"
            [class]="actual.activa
              ? 'bg-emerald-50 text-emerald-800 ring-emerald-500/20'
              : 'bg-sky-50/70 text-slate-600 ring-sky-200/60'"
          >
            <span class="h-2 w-2 rounded-full bg-current opacity-80"></span>
            {{ actual.activa ? 'Activa' : 'Inactiva' }}
          </span>
        }
      </header>

      @if (cargando()) {
        <app-cargando texto="Cargando la fórmula…" />
      } @else if (errorCarga()) {
        <div class="rounded-3xl border border-rose-200 bg-rose-50/60 p-6 text-center">
          <p class="text-sm font-bold text-rose-800">{{ errorCarga() }}</p>
          <div class="mt-3 flex justify-center">
            <a routerLink="/formula-produccion" [queryParams]="{ seccion: 'formulas' }">
              <app-boton variante="secundario" (click)="errorCarga.set(null)">Volver</app-boton>
            </a>
          </div>
        </div>
      } @else {
        <!-- Formulario Unificado en un solo panel integrado -->
        <div class="tarjeta p-6 sm:p-8 lg:p-10 space-y-8 divide-y divide-slate-100">

          <!-- 1. Datos de la fórmula -->
          <section class="space-y-5">
            <div class="flex items-center gap-3">
              <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-800 text-sm font-black shadow-2xs">
                1
              </span>
              <div>
                <h2 class="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">Datos de la fórmula</h2>
                <p class="text-xs text-slate-500 font-medium">Nombre identificador y producto al que aplica la mezcla.</p>
              </div>
            </div>

            <div class="grid gap-6 sm:grid-cols-2">
              <div>
                <label class="etiqueta mb-2 block" for="formula-nombre">
                  Nombre de la fórmula
                </label>
                <input
                  id="formula-nombre"
                  type="text"
                  maxlength="150"
                  [ngModel]="nombre()"
                  (ngModelChange)="nombre.set($any($event))"
                  class="campo"
                  placeholder="Ej. Mezcla estándar hojuela"
                  data-testid="formula-papa-nombre"
                />
              </div>
              <div>
                <label class="etiqueta mb-2 block" for="formula-producto">
                  Producto
                </label>
                <select
                  id="formula-producto"
                  [ngModel]="productoId()"
                  (ngModelChange)="productoId.set($any($event))"
                  class="campo"
                  data-testid="formula-papa-producto"
                >
                  <option [ngValue]="null">Elige un producto…</option>
                  @for (producto of productos(); track producto.id) {
                    <option [ngValue]="producto.id">{{ producto.nombre_comercial }}</option>
                  }
                </select>
              </div>
            </div>
          </section>

          <!-- 2. Mezcla por tanda -->
          <section class="pt-8 space-y-5">
            <div class="flex items-center gap-3">
              <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-800 text-sm font-black shadow-2xs">
                2
              </span>
              <div>
                <h2 class="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">Mezcla por tanda</h2>
                <p class="text-xs text-slate-500 font-medium">Bultos de cada referencia de papa cruda que se repiten en cada tanda.</p>
              </div>
            </div>

            <div class="tabla-contenedor border border-slate-200/80 shadow-2xs">
              <table class="tabla min-w-150">
                <thead>
                  <tr>
                    <th class="py-3.5 px-4">Referencia</th>
                    <th class="px-4 py-3.5">Bultos por tanda</th>
                    <th class="px-4 py-3.5 text-right">%</th>
                    <th class="px-4 py-3.5 text-right">Kg crudos</th>
                    <th class="px-4 py-3.5 text-right">Kg fritos</th>
                    <th class="py-3.5 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  @for (fila of filas(); track $index; let indice = $index) {
                    <tr>
                      <td class="py-3.5 px-4">
                        <select
                          [ngModel]="fila.referencia_papa_id"
                          (ngModelChange)="fijarReferencia(indice, $any($event))"
                          class="campo min-w-56"
                          aria-label="Referencia de papa de la mezcla"
                          [attr.data-testid]="'formula-papa-referencia-' + indice"
                        >
                          <option [ngValue]="null">Elige una referencia…</option>
                          @for (referencia of referencias(); track referencia.id) {
                            <option
                              [ngValue]="referencia.id"
                              [disabled]="!referenciaCompleta(referencia)"
                            >
                              {{ referencia.nombre }}
                              @if (!referenciaCompleta(referencia)) {
                                — {{ motivoIncompleta(referencia) }}
                              }
                            </option>
                          }
                        </select>
                      </td>
                      <td class="px-4 py-3.5">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          inputmode="numeric"
                          [ngModel]="fila.bultos_por_tanda"
                          (ngModelChange)="fijarBultos(indice, $any($event))"
                          class="campo w-32 text-right font-mono text-base font-bold"
                          aria-label="Bultos por tanda de la referencia"
                          [attr.data-testid]="'formula-papa-bultos-' + indice"
                        />
                      </td>
                      <td class="px-4 py-3.5 text-right font-mono text-sm font-semibold text-slate-700">
                        {{ porcentajeFila(fila) | number: '1.0-1' }} %
                      </td>
                      <td class="px-4 py-3.5 text-right font-mono text-sm font-semibold text-slate-700">
                        {{ kgCrudosFila(fila) | number: '1.0-2' }} kg
                      </td>
                      <td class="px-4 py-3.5 text-right font-mono text-sm font-semibold text-slate-700">
                        @if (referenciaDe(fila)?.rendimiento_fritura_pct !== null) {
                          {{ kgFritosFila(fila) | number: '1.0-2' }} kg
                        } @else {
                          —
                        }
                      </td>
                      <td class="py-3.5 px-4 text-right">
                        <app-boton
                          variante="texto"
                          tamano="pequeno"
                          [deshabilitado]="filas().length <= 1"
                          (click)="quitarFila(indice)"
                        >
                          Quitar
                        </app-boton>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="flex flex-wrap items-center gap-3 pt-2">
              <app-boton variante="secundario" (click)="agregarFila()">
                + Agregar referencia
              </app-boton>
              <app-boton
                variante="primario"
                [deshabilitado]="!puedeRepartir()"
                [cargando]="repartiendo()"
                testId="formula-papa-repartir"
                (click)="repartir()"
              >
                @if (capacidadHorno(); as capacidad) {
                  Repartir {{ capacidad }} bultos entre las referencias
                } @else {
                  Repartir la capacidad del horno
                }
              </app-boton>
            </div>
          </section>

          <!-- 3. Resumen y capacidad de horno -->
          <section class="pt-8 space-y-5">
            <div class="flex items-center gap-3">
              <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-800 text-sm font-black shadow-2xs">
                3
              </span>
              <div>
                <h2 class="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">Resumen por tanda</h2>
                <p class="text-xs text-slate-500 font-medium">Carga proyectada por tanda y relación frente a la capacidad del horno.</p>
              </div>
            </div>
            @if (capacidadHorno(); as capacidad) {
              <div
                class="rounded-2xl border border-sky-200/80 bg-sky-50/50 p-5 sm:p-6 shadow-2xs"
                data-testid="formula-papa-capacidad"
              >
                <div class="flex items-center justify-between text-sm sm:text-base font-extrabold text-slate-900">
                  <span>Capacidad del Horno por Tanda</span>
                  <span class="font-mono text-sky-950 font-black text-base sm:text-lg">
                    {{ totalBultos() }} / {{ capacidad }} bultos
                  </span>
                </div>
                <div class="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200/90 shadow-inner">
                  <div
                    class="h-full rounded-full transition-all duration-300"
                    [class]="barraCapacidad().clase"
                    [style.width.%]="barraCapacidad().porcentaje"
                  ></div>
                </div>
                @if (excedeCapacidad()) {
                  <p class="mt-3 text-xs font-bold text-rose-700 flex items-center gap-1.5">
                    ⚠️ La mezcla supera los {{ capacidad }} bultos que procesa el horno. Reparte la
                    capacidad o ajusta los bultos antes de guardar.
                  </p>
                } @else if (totalBultos() === capacidad) {
                  <p class="mt-3 text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    ✓ La tanda va a capacidad completa: {{ capacidad }} bultos en total.
                  </p>
                } @else {
                  <p class="mt-3 text-xs font-semibold text-slate-500">
                    ℹ️ El horno admite hasta {{ capacidad }} bultos por tanda.
                  </p>
                }
              </div>
            }

            <div class="grid gap-4 sm:grid-cols-3">
              <div class="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
                <p class="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Bultos por tanda
                </p>
                <p class="font-mono mt-3 text-2xl sm:text-3xl font-black text-slate-900" data-testid="formula-papa-total">
                  {{ totalBultos() }}
                </p>
              </div>
              <div class="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
                <p class="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Kg crudos por tanda
                </p>
                <p class="font-mono mt-3 text-xl sm:text-2xl font-black text-slate-900">
                  {{ totalKgCrudos() | number: '1.0-2' }} <span class="text-xs font-bold text-slate-500">kg</span>
                </p>
              </div>
              <div class="rounded-2xl border border-amber-200/90 bg-amber-50/40 p-5 shadow-xs flex flex-col justify-between">
                <p class="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Kg fritos por tanda
                </p>
                <p class="font-mono mt-3 text-xl sm:text-2xl font-black text-amber-900">
                  @if (faltaRendimiento()) {
                    —
                  } @else {
                    {{ totalKgFritos() | number: '1.0-2' }} <span class="text-xs font-bold text-amber-800">kg</span>
                  }
                </p>
              </div>
            </div>

            @if (!capacidadHorno()) {
              <p class="text-xs font-medium text-slate-400">
                Configura la capacidad de los hornos para ver el tope por tanda.
              </p>
            }
          </section>

          <!-- 4. Notas para el operario -->
          <section class="pt-8 space-y-4">
            <div class="flex items-center gap-3">
              <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-800 text-sm font-black shadow-2xs">
                4
              </span>
              <div>
                <h2 class="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">Notas para horno</h2>
                <p class="text-xs text-slate-500 font-medium">Instrucciones opcionales que verá el operario al preparar la mezcla.</p>
              </div>
            </div>

            <div>
              <label class="etiqueta mb-2 block" for="formula-notas">
                Notas para el operario (opcional)
              </label>
              <textarea
                id="formula-notas"
                [ngModel]="notas()"
                (ngModelChange)="notas.set($any($event))"
                maxlength="500"
                rows="3"
                class="campo mt-1"
                placeholder="Instrucciones de la mezcla para el operario en línea..."
              ></textarea>
            </div>
          </section>

          <!-- 5. Acciones y Guardado -->
          <section class="pt-8 space-y-6">
            @if (advertencias().length > 0) {
              <ul class="space-y-2 rounded-2xl bg-amber-50/80 border border-amber-200/80 p-4">
                @for (advertencia of advertencias(); track advertencia) {
                  <li class="text-xs font-bold text-amber-900 flex items-center gap-2">⚠️ {{ advertencia }}</li>
                }
              </ul>
            }

            @if (avisoGuardado()) {
              <p class="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3.5 text-sm font-bold text-emerald-900 flex items-center gap-2">
                ✓ {{ avisoGuardado() }}
              </p>
            }

            <div class="flex flex-wrap items-center gap-4 pt-2">
              <app-boton
                variante="primario"
                tamano="grande"
                [cargando]="guardando()"
                [deshabilitado]="!puedeGuardar()"
                testId="formula-papa-guardar"
                (click)="guardar()"
              >
                {{ id() ? 'Guardar cambios' : 'Crear fórmula' }}
              </app-boton>

              @if (formula(); as actual) {
                @if (actual.activa) {
                  <app-boton
                    variante="secundario"
                    [cargando]="cambiandoEstado()"
                    testId="formula-papa-desactivar"
                    (click)="desactivar()"
                  >
                    Desactivar
                  </app-boton>
                } @else {
                  <app-boton
                    variante="acento"
                    [cargando]="cambiandoEstado()"
                    testId="formula-papa-activar"
                    (click)="activar()"
                  >
                    Activar para {{
                      nombreProducto(actual.producto.id) || actual.producto.nombre_comercial
                    }}
                  </app-boton>
                  <app-boton
                    variante="peligro"
                    [cargando]="eliminando()"
                    testId="formula-papa-eliminar"
                    (click)="confirmarEliminar.set(true)"
                  >
                    Eliminar
                  </app-boton>
                }
              }
            </div>

            @if (formula(); as actual) {
              <p class="text-xs font-medium text-slate-400">
                Creada por {{ actual.creado_por?.nombre_completo ?? 'Bodega' }}.
                @if (actual.activa) {
                  Las órdenes nuevas de
                  <span class="font-bold text-slate-600">{{ nombreProducto(actual.producto.id) }}</span>
                  usarán esta mezcla automáticamente.
                } @else {
                  Actívala para que el supervisor la vea al crear la orden.
                }
              </p>
            }
          </section>

        </div>
      }

      <app-confirmar
        [abierto]="confirmarEliminar()"
        titulo="Eliminar la fórmula"
        [mensaje]="mensajeEliminar()"
        textoConfirmar="Sí, eliminar"
        [peligroso]="true"
        (confirmado)="eliminar()"
        (cancelado)="confirmarEliminar.set(false)"
      />
    </div>
  `,
})
export class FormulaPapaFormPage {
  readonly id = input<string | undefined>();

  private readonly catalogos = inject(CatalogosService);
  private readonly bodega = inject(BodegaService);
  private readonly formulas = inject(FormulasPapaService);
  private readonly avisos = inject(NotificacionesService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly cambiandoEstado = signal(false);
  protected readonly eliminando = signal(false);
  protected readonly confirmarEliminar = signal(false);
  protected readonly avisoGuardado = signal<string | null>(null);
  protected readonly advertencias = signal<string[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly referencias = signal<ReferenciaPapa[]>([]);
  protected readonly hornos = signal<Horno[]>([]);
  protected readonly formula = signal<FormulaPapa | null>(null);
  protected readonly repartiendo = signal(false);

  protected readonly nombre = signal('');
  protected readonly productoId = signal<number | null>(null);
  protected readonly notas = signal('');
  protected readonly filas = signal<FilaPlantilla[]>([
    { referencia_papa_id: null, bultos_por_tanda: 1 },
  ]);

  protected readonly totalBultos = computed(() =>
    this.filas().reduce((acc, fila) => acc + (Number(fila.bultos_por_tanda) || 0), 0),
  );

  /** Bultos por hora que procesan los hornos activos (hoy 50). */
  protected readonly capacidadHorno = computed(() => {
    const capacidades = this.hornos()
      .map((horno) => Number(horno.capacidad_bultos_hora ?? 0))
      .filter((capacidad) => capacidad > 0);
    return capacidades.length > 0 ? Math.max(...capacidades) : null;
  });

  protected readonly excedeCapacidad = computed(() => {
    const capacidad = this.capacidadHorno();
    return capacidad !== null && this.totalBultos() > capacidad;
  });

  protected readonly barraCapacidad = computed(() => {
    const capacidad = this.capacidadHorno();
    if (!capacidad) {
      return { porcentaje: 0, clase: 'bg-emerald-400' };
    }
    if (this.totalBultos() > capacidad) {
      return { porcentaje: 100, clase: 'bg-rose-500' };
    }
    const porcentaje = Math.min(100, (this.totalBultos() / capacidad) * 100);
    return { porcentaje, clase: porcentaje >= 90 ? 'bg-amber-400' : 'bg-emerald-400' };
  });

  protected readonly puedeRepartir = computed(() => {
    const ids = this.filas()
      .map((fila) => fila.referencia_papa_id)
      .filter((id): id is number => id !== null);
    return ids.length > 0 && new Set(ids).size === ids.length && !this.repartiendo();
  });
  protected readonly totalKgCrudos = computed(() =>
    this.filas().reduce((acc, fila) => acc + this.kgCrudosFila(fila), 0),
  );
  protected readonly totalKgFritos = computed(() =>
    this.filas().reduce((acc, fila) => acc + this.kgFritosFila(fila), 0),
  );

  /** Sin rendimiento en alguna referencia no se pueden estimar kg fritos. */
  protected readonly faltaRendimiento = computed(() =>
    this.filas().some(
      (fila) =>
        fila.referencia_papa_id !== null &&
        this.referenciaDe(fila)?.rendimiento_fritura_pct == null,
    ),
  );

  protected readonly puedeGuardar = computed(() => {
    if (!this.nombre().trim() || !this.productoId() || this.guardando()) {
      return false;
    }
    const filas = this.filas();
    if (filas.length === 0) {
      return false;
    }
    if (
      filas.some(
        (fila) =>
          !fila.referencia_papa_id ||
          !Number.isFinite(Number(fila.bultos_por_tanda)) ||
          Number(fila.bultos_por_tanda) < 1,
      )
    ) {
      return false;
    }
    // La mezcla de una tanda no puede superar lo que procesa el horno.
    if (this.excedeCapacidad()) {
      return false;
    }
    const ids = filas.map((fila) => fila.referencia_papa_id);
    if (new Set(ids).size !== ids.length) {
      return false;
    }
    return this.totalBultos() > 0;
  });

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    forkJoin({
      productos: this.catalogos.listarProductos(true, true),
      referencias: this.bodega.listar(true, true),
      hornos: this.catalogos.listarHornos(true),
    }).subscribe({
      next: ({ productos, referencias, hornos }) => {
        this.productos.set(productos);
        this.referencias.set(referencias);
        this.hornos.set(hornos);
        const id = Number(this.id());
        if (!id) {
          this.cargando.set(false);
          return;
        }
        this.formulas.obtener(id).subscribe({
          next: (formula) => {
            this.formula.set(formula);
            this.nombre.set(formula.nombre);
            this.productoId.set(formula.producto.id);
            this.notas.set(formula.notas ?? '');
            this.filas.set(
              formula.referencias.map((fila) => ({
                referencia_papa_id: fila.referencia_id,
                bultos_por_tanda: fila.bultos_por_tanda,
              })),
            );
            this.cargando.set(false);
          },
          error: (respuesta: HttpErrorResponse) => {
            this.cargando.set(false);
            this.errorCarga.set(this.mensajeError(respuesta, 'No se pudo cargar la fórmula.'));
          },
        });
      },
      error: () => {
        this.cargando.set(false);
        this.errorCarga.set('No se pudieron cargar los catálogos. Revisa la conexión.');
      },
    });
  }

  protected nombreProducto(productoId: number): string {
    return (
      this.productos().find((producto) => producto.id === productoId)?.nombre_comercial ?? ''
    );
  }

  protected referenciaDe(fila: FilaPlantilla): ReferenciaPapa | null {
    return (
      this.referencias().find((referencia) => referencia.id === fila.referencia_papa_id) ?? null
    );
  }

  protected referenciaCompleta(referencia: ReferenciaPapa): boolean {
    // Bodega solo captura nombre y peso: con peso > 0 la referencia sirve.
    return referencia.peso_promedio_bulto_kg > 0;
  }

  protected motivoIncompleta(_referencia: ReferenciaPapa): string {
    return 'falta peso por bulto';
  }

  protected kgCrudosFila(fila: FilaPlantilla): number {
    const referencia = this.referenciaDe(fila);
    if (!referencia) {
      return 0;
    }
    return calcularKgCrudosPreview(Number(fila.bultos_por_tanda), referencia.peso_promedio_bulto_kg);
  }

  protected kgFritosFila(fila: FilaPlantilla): number {
    const referencia = this.referenciaDe(fila);
    if (!referencia) {
      return 0;
    }
    return calcularKgFritosPreview(
      this.kgCrudosFila(fila),
      referencia.rendimiento_fritura_pct,
    );
  }

  protected porcentajeFila(fila: FilaPlantilla): number {
    const total = this.totalBultos();
    if (total <= 0) {
      return 0;
    }
    return (Number(fila.bultos_por_tanda) / total) * 100;
  }

  /** Actualiza una fila creando un array nuevo: los computed reaccionan. */
  protected fijarReferencia(indice: number, referenciaId: number | null): void {
    this.filas.update((filas) =>
      filas.map((fila, posicion) =>
        posicion === indice ? { ...fila, referencia_papa_id: referenciaId } : fila,
      ),
    );
  }

  protected fijarBultos(indice: number, bultos: number | string | null): void {
    const valor = Number(bultos);
    this.filas.update((filas) =>
      filas.map((fila, posicion) =>
        posicion === indice
          ? { ...fila, bultos_por_tanda: Number.isFinite(valor) ? valor : 0 }
          : fila,
      ),
    );
  }

  protected agregarFila(): void {
    this.filas.update((filas) => [...filas, { referencia_papa_id: null, bultos_por_tanda: 1 }]);
  }

  protected quitarFila(indice: number): void {
    this.filas.update((filas) => filas.filter((_, posicion) => posicion !== indice));
  }

  /** Reparte la capacidad del horno entre las referencias elegidas. */
  protected repartir(): void {
    if (!this.puedeRepartir()) {
      return;
    }
    const ids = this.filas()
      .map((fila) => fila.referencia_papa_id)
      .filter((id): id is number => id !== null);
    this.repartiendo.set(true);
    this.advertencias.set([]);
    this.formulas.sugerir(ids).subscribe({
      next: (sugerencia) => {
        this.repartiendo.set(false);
        const distribucion = new Map(
          sugerencia.referencias.map((fila) => [fila.referencia_papa_id, fila.bultos_por_tanda]),
        );
        this.filas.update((filas) =>
          filas.map((fila) =>
            fila.referencia_papa_id && distribucion.has(fila.referencia_papa_id)
              ? { ...fila, bultos_por_tanda: distribucion.get(fila.referencia_papa_id) as number }
              : fila,
          ),
        );
      },
      error: (respuesta: HttpErrorResponse) => {
        this.repartiendo.set(false);
        this.advertencias.set([this.mensajeError(respuesta, 'No se pudo repartir la mezcla.')]);
      },
    });
  }

  protected guardar(): void {
    if (!this.puedeGuardar()) {
      return;
    }
    const datos: FormulaPapaGuardar = {
      nombre: this.nombre().trim(),
      producto_id: this.productoId() as number,
      referencias: this.filas().map((fila) => ({
        referencia_papa_id: fila.referencia_papa_id as number,
        bultos_por_tanda: Number(fila.bultos_por_tanda),
      })),
      notas: this.notas().trim() || null,
    };

    this.guardando.set(true);
    this.advertencias.set([]);
    const id = Number(this.id());
    const peticion = id ? this.formulas.actualizar(id, datos) : this.formulas.crear(datos);

    peticion.subscribe({
      next: (formula) => {
        this.guardando.set(false);
        this.formula.set(formula);
        this.filas.set(
          formula.referencias.map((fila) => ({
            referencia_papa_id: fila.referencia_id,
            bultos_por_tanda: fila.bultos_por_tanda,
          })),
        );
        if (id) {
          this.avisos.exito('Fórmula actualizada. Las órdenes ya creadas no cambian.');
          this.avisoGuardado.set('Fórmula actualizada.');
        } else {
          this.avisos.exito('Fórmula creada. Actívala para que las órdenes nuevas la apliquen.');
          void this.router.navigate(['/formula-produccion', 'formulas', formula.id], {
            queryParams: { seccion: 'formulas' },
          });
        }
      },
      error: (respuesta: HttpErrorResponse) => {
        this.guardando.set(false);
        this.advertencias.set([this.mensajeError(respuesta, 'No se pudo guardar la fórmula.')]);
      },
    });
  }

  protected activar(): void {
    const actual = this.formula();
    if (!actual || this.cambiandoEstado()) {
      return;
    }
    this.cambiandoEstado.set(true);
    this.formulas.activar(actual.id).subscribe({
      next: (formula) => {
        this.formula.set(formula);
        this.cambiandoEstado.set(false);
        this.avisos.exito(
          `Fórmula activada para ${formula.producto.nombre_comercial}. Las órdenes nuevas la aplicarán.`,
        );
      },
      error: (respuesta: HttpErrorResponse) => {
        this.cambiandoEstado.set(false);
        this.advertencias.set([this.mensajeError(respuesta, 'No se pudo activar la fórmula.')]);
      },
    });
  }

  protected desactivar(): void {
    const actual = this.formula();
    if (!actual || this.cambiandoEstado()) {
      return;
    }
    this.cambiandoEstado.set(true);
    this.formulas.desactivar(actual.id).subscribe({
      next: (formula) => {
        this.formula.set(formula);
        this.cambiandoEstado.set(false);
        this.avisos.exito('Fórmula desactivada. Las órdenes nuevas pedirán a Bodega.');
      },
      error: (respuesta: HttpErrorResponse) => {
        this.cambiandoEstado.set(false);
        this.advertencias.set([this.mensajeError(respuesta, 'No se pudo desactivar la fórmula.')]);
      },
    });
  }

  protected mensajeEliminar(): string {
    return `Se eliminará "${this.nombre()}" del catálogo. Las órdenes ya creadas conservan su mezcla.`;
  }

  protected eliminar(): void {
    const actual = this.formula();
    if (!actual || this.eliminando()) {
      return;
    }
    this.eliminando.set(true);
    this.formulas.eliminar(actual.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.confirmarEliminar.set(false);
        this.avisos.exito('Fórmula eliminada del catálogo.');
        void this.router.navigate(['/formula-produccion'], {
          queryParams: { seccion: 'formulas' },
        });
      },
      error: (respuesta: HttpErrorResponse) => {
        this.eliminando.set(false);
        this.confirmarEliminar.set(false);
        this.advertencias.set([this.mensajeError(respuesta, 'No se pudo eliminar la fórmula.')]);
      },
    });
  }

  private mensajeError(respuesta: HttpErrorResponse, porDefecto: string): string {
    const detalle = (respuesta.error as { detail?: string } | null)?.detail;
    return detalle ?? porDefecto;
  }
}
