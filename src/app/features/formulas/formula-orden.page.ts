import { DatePipe, DecimalPipe } from '@angular/common';
import type { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { Observable} from 'rxjs';
import { EMPTY, Subject, debounceTime, switchMap } from 'rxjs';

import type { OrdenBodega, ReferenciaPapa } from '../../core/modelos/bodega.model';
import type {
  EstadoFormula,
  Formula,
  FormulaProyeccion,
} from '../../core/modelos/formula.model';
import { AuthService } from '../../core/servicios/auth.service';
import { BodegaService } from '../../core/servicios/bodega.service';
import { FormulaService } from '../../core/servicios/formula.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { EtiquetaEstadoComponent } from '../../ui/etiqueta-estado.component';
import { TarjetaComponent } from '../../ui/tarjeta.component';
import { FormulaResumenComponent } from './formula-resumen.component';

interface FilaMezcla {
  referencia_papa_id: number | null;
  bultos_por_tanda: number;
}

const AVISOS_ESTADO: Record<EstadoFormula, string> = {
  sin_formula: 'Esta orden todavía no tiene fórmula. Defínela para que horno pueda iniciar.',
  lista: 'Fórmula lista. Horno ya puede iniciar la producción.',
  en_produccion: 'La fórmula quedó congelada al iniciar la producción.',
  finalizada: 'La orden finalizó; la fórmula quedó en solo lectura.',
  cancelada: 'La orden fue cancelada; la fórmula quedó en solo lectura.',
  no_aplica: 'Orden histórica: se produce con el registro de horno anterior.',
};

/**
 * Detalle de una orden para Bodega: encabezado tipo orden, editor de la
 * mezcla con proyección en vivo y avance planificado vs. producido.
 *
 * Solo se edita mientras la orden esté Pendiente y sin tandas; al iniciar
 * la producción la fórmula queda congelada.
 */
@Component({
  selector: 'app-formula-orden',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    DecimalPipe,
    DatePipe,
    BotonComponent,
    CargandoComponent,
    EtiquetaEstadoComponent,
    TarjetaComponent,
    FormulaResumenComponent,
  ],
  template: `
    <div class="space-y-6" data-testid="formula-orden">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <a
            routerLink="/formula-produccion"
            class="text-xs font-bold text-sky-600 hover:underline"
          >
            ← Volver a Fórmula de producción
          </a>
          <h1 class="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Fórmula de la orden
          </h1>
        </div>
        @if (orden()) {
          <span class="font-mono rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">
            #{{ orden()!.numero_orden }}
          </span>
        }
      </header>

      @if (cargando()) {
        <app-cargando texto="Cargando la orden…" />
      } @else if (errorCarga()) {
        <div class="rounded-3xl border border-rose-200 bg-rose-50/60 p-6 text-center">
          <p class="text-sm font-bold text-rose-800">{{ errorCarga() }}</p>
          <div class="mt-3 flex justify-center">
            <app-boton variante="secundario" (click)="cargar()">Reintentar</app-boton>
          </div>
        </div>
      } @else if (orden(); as actual) {
        <!-- A. Encabezado tipo orden -->
        <app-tarjeta titulo="Orden solicitada por el supervisor" [sinRelleno]="true">
          <div class="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Producto</p>
              <p class="mt-0.5 text-sm font-extrabold text-slate-900">
                {{ actual.producto.nombre_comercial }}
              </p>
              <p class="text-xs font-medium text-slate-400">{{ actual.categoria.nombre }}</p>
            </div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cantidad pedida</p>
              <p class="mt-0.5 font-mono text-sm font-extrabold text-slate-900">
                {{ actual.cantidad_programada | number: '1.0-2' }}
                {{ actual.unidad_solicitada === 'kg' ? 'kg' : 'canastillas' }}
              </p>
              @if (actual.cantidad_canastillas_solicitadas) {
                <p class="text-xs font-medium text-slate-400">
                  {{ actual.cantidad_canastillas_solicitadas | number: '1.0-0' }} canastillas
                </p>
              }
            </div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Horas / horno</p>
              <p class="mt-0.5 text-sm font-extrabold text-slate-900">
                {{ actual.horas_produccion }} h · {{ actual.horno.nombre }}
              </p>
              <p class="text-xs font-medium text-slate-400">{{ actual.turno.nombre }}</p>
            </div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Estado</p>
              <div class="mt-1 flex flex-wrap items-center gap-2">
                <app-etiqueta-estado [estado]="actual.estado" [texto]="actual.estado_etiqueta" />
                @if (actual.destino === 'exportacion') {
                  <app-etiqueta-estado estado="exportacion" texto="Exportación" />
                }
              </div>
              <p class="mt-1 text-xs font-medium text-slate-400">
                Supervisor: {{ actual.supervisor.nombre_completo }}
              </p>
            </div>
          </div>

          <div class="border-t border-slate-100 px-6 py-3.5">
            <p class="text-xs font-semibold text-slate-500">
              {{ avisoEstado() }}
            </p>
            @if (formula()?.fecha_actualizacion) {
              <p class="mt-0.5 text-[11px] font-medium text-slate-400">
                Última actualización: {{ formula()!.fecha_actualizacion | date: 'dd/MM/yyyy HH:mm' }}
                @if (formula()!.actualizada_por) {
                  · {{ formula()!.actualizada_por!.nombre_completo }}
                }
              </p>
            }
          </div>
        </app-tarjeta>

        <!-- B. Editor o solo lectura -->
        <app-tarjeta
          [titulo]="editable() ? 'Mezcla de la orden' : 'Fórmula congelada'"
          [subtitulo]="editable()
            ? 'Bultos por referencia en cada tanda. La misma mezcla se repite en todas las tandas.'
            : 'La fórmula ya no se edita. Fase futura: ajustes con auditoría.'"
        >
          @if (sinCapacidad()) {
            <div class="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
              <p class="text-sm font-bold text-amber-900">
                El horno no tiene capacidad configurada. Un administrador o supervisor debe
                completarla en Hornos.
              </p>
              @if (auth.esAdmin()) {
                <a routerLink="/hornos" class="mt-1 inline-block text-xs font-bold text-amber-800 underline">
                  Ir a Hornos
                </a>
              }
            </div>
          } @else if (editable()) {
            <div class="space-y-4">
              <div class="overflow-x-auto">
                <table class="w-full min-w-150 text-left text-sm">
                  <thead class="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th class="py-2 pr-3">Referencia</th>
                      <th class="px-3 py-2">Bultos por tanda</th>
                      <th class="px-3 py-2 text-right">%</th>
                      <th class="px-3 py-2 text-right">Kg crudos</th>
                      <th class="px-3 py-2 text-right">Kg fritos</th>
                      <th class="py-2 pl-3"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (fila of filas(); track $index; let indice = $index) {
                      <tr>
                        <td class="py-2.5 pr-3">
                          <select
                            [(ngModel)]="fila.referencia_papa_id"
                            (ngModelChange)="programarProyeccion()"
                            class="w-full min-w-52 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                            [attr.data-testid]="'formula-referencia-' + (fila.referencia_papa_id ?? indice)"
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
                        <td class="px-3 py-2.5">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            inputmode="numeric"
                            [(ngModel)]="fila.bultos_por_tanda"
                            (ngModelChange)="programarProyeccion()"
                            class="w-28 rounded-xl border border-slate-200 px-3 py-2 text-right font-mono text-sm font-bold text-slate-800"
                            [attr.data-testid]="'formula-bultos-' + (fila.referencia_papa_id ?? indice)"
                          />
                        </td>
                        <td class="px-3 py-2.5 text-right font-mono text-slate-600">
                          {{ datoProyeccion(fila.referencia_papa_id)?.porcentaje_produccion_pct | number: '1.0-1' }}
                        </td>
                        <td class="px-3 py-2.5 text-right font-mono text-slate-600">
                          {{ datoProyeccion(fila.referencia_papa_id)?.kg_crudos_por_tanda | number: '1.0-2' }}
                        </td>
                        <td class="px-3 py-2.5 text-right font-mono text-slate-600">
                          {{ datoProyeccion(fila.referencia_papa_id)?.kg_fritos_por_tanda | number: '1.0-2' }}
                        </td>
                        <td class="py-2.5 pl-3 text-right">
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

              <div class="flex flex-wrap items-center gap-2">
                <app-boton variante="secundario" tamano="pequeno" (click)="agregarFila()">
                  + Agregar referencia
                </app-boton>
                <app-boton
                  variante="secundario"
                  tamano="pequeno"
                  [cargando]="proyectando()"
                  (click)="usarSugerencia()"
                >
                  Usar mezcla sugerida
                </app-boton>
              </div>

              <!-- Totales en vivo -->
              @if (proyeccion(); as proy) {
                <div class="grid gap-4 rounded-2xl bg-slate-50 p-4 lg:grid-cols-3">
                  <div>
                    <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Bultos por tanda
                    </p>
                    <p class="font-mono mt-0.5 text-xl font-black text-slate-900" data-testid="formula-total-tanda">
                      {{ proy.total_bultos_por_tanda }}
                      <span class="text-xs font-semibold text-slate-400">
                        / {{ proy.capacidad_bultos_hora ?? '—' }} por hora
                      </span>
                    </p>
                    <div class="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        class="h-full rounded-full transition-all duration-300"
                        [class]="barraBultos().clase"
                        [style.width.%]="barraBultos().porcentaje"
                      ></div>
                    </div>
                  </div>
                  <div>
                    <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Kg de la orden ({{ proy.tandas_programadas }} tandas)
                    </p>
                    <p class="font-mono mt-0.5 text-sm font-extrabold text-slate-900">
                      {{ proy.total_kg_crudos | number: '1.0-2' }} kg crudos ·
                      {{ proy.total_kg_fritos_estimados | number: '1.0-2' }} kg fritos
                    </p>
                    <p class="mt-1 text-xs font-semibold" [class]="claseDiferencia()">
                      Diferencia vs. pedido:
                      {{ proy.diferencia_kg | number: '1.0-2' }} kg
                      ({{ proy.diferencia_pct | number: '1.0-1' }} %)
                    </p>
                  </div>
                  <div>
                    <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Tandas
                    </p>
                    <p class="font-mono mt-0.5 text-sm font-extrabold text-slate-900">
                      {{ formula()?.tandas_registradas ?? 0 }} registradas /
                      {{ proy.tandas_programadas }} programadas
                    </p>
                    @if (proyectando()) {
                      <p class="mt-1 text-[11px] font-semibold text-sky-600">Actualizando vista previa…</p>
                    }
                  </div>
                </div>

                @if (proy.mensaje) {
                  <p
                    class="rounded-2xl px-4 py-3 text-sm font-semibold"
                    [class]="proy.factible
                      ? 'bg-amber-50 text-amber-900'
                      : 'bg-rose-50 text-rose-800'"
                  >
                    {{ proy.mensaje }}
                  </p>
                }
              }

              <label class="block">
                <span class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Notas para horno (opcional)
                </span>
                <textarea
                  [(ngModel)]="notas"
                  maxlength="500"
                  rows="2"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                  placeholder="Instrucciones de la mezcla para el operario"
                ></textarea>
              </label>

              <div class="flex flex-wrap items-center gap-3">
                <app-boton
                  variante="primario"
                  tamano="grande"
                  [cargando]="guardando()"
                  [deshabilitado]="!puedeGuardar()"
                  testId="formula-guardar"
                  (click)="guardar()"
                >
                  Guardar fórmula
                </app-boton>
                @if (puedeGuardar()) {
                  <p class="text-xs font-medium text-slate-400">
                    Al iniciar la producción la fórmula quedará congelada.
                  </p>
                }
              </div>

              @if (advertencias().length > 0) {
                <ul class="space-y-1 rounded-2xl bg-amber-50 px-4 py-3">
                  @for (advertencia of advertencias(); track advertencia) {
                    <li class="text-xs font-semibold text-amber-900">⚠️ {{ advertencia }}</li>
                  }
                </ul>
              }
            </div>
          } @else if (formula()?.referencias?.length) {
            <app-formula-resumen
              [formula]="formula()!"
              modo="completo"
              [mostrarProducido]="true"
            />
          } @else {
            <p class="rounded-2xl bg-calido-50 px-4 py-3 text-sm font-medium text-stone-600">
              {{ avisoEstado() }}
            </p>
          }
        </app-tarjeta>

        <!-- C. Avance -->
        @if (formula()?.referencias?.length) {
          <app-tarjeta
            titulo="Avance planificado vs. producido"
            subtitulo="La mezcla se repite en todas las tandas; el producido sale de las tandas registradas."
          >
            <app-formula-resumen
              [formula]="formula()!"
              modo="completo"
              [mostrarProducido]="true"
            />
          </app-tarjeta>
        }
      }
    </div>
  `,
})
export class FormulaOrdenPage {
  private readonly ruta = inject(ActivatedRoute);
  private readonly bodega = inject(BodegaService);
  private readonly formulas = inject(FormulaService);
  private readonly avisos = inject(NotificacionesService);
  protected readonly auth = inject(AuthService);

  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly orden = signal<OrdenBodega | null>(null);
  protected readonly formula = signal<Formula | null>(null);
  protected readonly referencias = signal<ReferenciaPapa[]>([]);
  protected readonly filas = signal<FilaMezcla[]>([]);
  protected readonly proyeccion = signal<FormulaProyeccion | null>(null);
  protected readonly proyectando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly advertencias = signal<string[]>([]);

  protected notas = '';
  private readonly cambios = new Subject<void>();

  protected readonly editable = computed(() => {
    const formula = this.formula();
    const orden = this.orden();
    return (
      !!formula &&
      !!orden &&
      orden.estado === 'pendiente' &&
      (formula.estado === 'sin_formula' || formula.estado === 'lista') &&
      formula.tandas_registradas === 0
    );
  });

  protected readonly sinCapacidad = computed(() => {
    const formula = this.formula();
    return (
      !!formula &&
      formula.estado !== 'no_aplica' &&
      formula.estado !== 'sin_formula' &&
      formula.capacidad_bultos_hora === null
    );
  });

  protected readonly avisoEstado = computed(() => {
    const formula = this.formula();
    return formula ? AVISOS_ESTADO[formula.estado] : '';
  });

  protected readonly barraBultos = computed(() => {
    const proy = this.proyeccion();
    if (!proy || !proy.capacidad_bultos_hora) {
      return { porcentaje: 0, clase: 'bg-emerald-400' };
    }
    const porcentaje = Math.min(100, (proy.total_bultos_por_tanda / proy.capacidad_bultos_hora) * 100);
    if (proy.total_bultos_por_tanda > proy.capacidad_bultos_hora) {
      return { porcentaje: 100, clase: 'bg-rose-500' };
    }
    if (porcentaje >= 90) {
      return { porcentaje, clase: 'bg-amber-400' };
    }
    return { porcentaje, clase: 'bg-emerald-400' };
  });

  protected readonly puedeGuardar = computed(() => {
    const proy = this.proyeccion();
    const filas = this.filas();
    if (!proy || !proy.factible || this.proyectando() || this.guardando()) {
      return false;
    }
    if (filas.some((fila) => !fila.referencia_papa_id || fila.bultos_por_tanda < 1)) {
      return false;
    }
    const ids = filas.map((fila) => fila.referencia_papa_id);
    if (new Set(ids).size !== ids.length) {
      return false;
    }
    return proy.total_bultos_por_tanda > 0;
  });

  constructor() {
    this.cambios.pipe(debounceTime(300), switchMap(() => this.solicitarProyeccion())).subscribe({
      next: (proyeccion) => {
        this.proyeccion.set(proyeccion);
        this.proyectando.set(false);
      },
      error: (respuesta: HttpErrorResponse) => {
        this.proyectando.set(false);
        this.advertencias.set([this.mensajeError(respuesta)]);
      },
    });
    this.cargar();
  }

  protected cargar(): void {
    const id = Number(this.ruta.snapshot.paramMap.get('id'));
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.bodega.obtenerOrden(id).subscribe({
      next: (detalle) => {
        this.orden.set(detalle.orden);
        this.formula.set(detalle.formula);
        this.notas = detalle.formula.notas ?? '';
        this.filas.set(
          detalle.formula.referencias.length > 0
            ? detalle.formula.referencias.map((fila) => ({
                referencia_papa_id: fila.referencia_id,
                bultos_por_tanda: fila.bultos_por_tanda,
              }))
            : [{ referencia_papa_id: null, bultos_por_tanda: 1 }],
        );
        this.cargando.set(false);
        if (this.editable()) {
          this.programarProyeccion();
        }
      },
      error: (respuesta: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorCarga.set(
          respuesta.status === 403
            ? 'No tienes permiso para ver esta orden de Bodega.'
            : 'No se pudo cargar la orden. Revisa la conexión e intenta de nuevo.',
        );
      },
    });

    this.bodega.listar(true, true).subscribe({
      next: (referencias) => this.referencias.set(referencias),
      error: () => this.referencias.set([]),
    });
  }

  protected referenciaCompleta(referencia: ReferenciaPapa): boolean {
    return (
      !!referencia.tipo &&
      referencia.tipo.trim() !== '' &&
      referencia.peso_promedio_bulto_kg > 0 &&
      referencia.rendimiento_fritura_pct !== null &&
      referencia.rendimiento_fritura_pct > 0
    );
  }

  protected motivoIncompleta(referencia: ReferenciaPapa): string {
    if (!referencia.tipo || referencia.tipo.trim() === '') {
      return 'falta tipo';
    }
    if (!referencia.peso_promedio_bulto_kg || referencia.peso_promedio_bulto_kg <= 0) {
      return 'falta peso por bulto';
    }
    return 'falta rendimiento';
  }

  protected datoProyeccion(referenciaId: number | null) {
    if (!referenciaId) {
      return null;
    }
    return this.proyeccion()?.referencias.find((fila) => fila.referencia_id === referenciaId) ?? null;
  }

  protected agregarFila(): void {
    this.filas.update((filas) => [...filas, { referencia_papa_id: null, bultos_por_tanda: 1 }]);
  }

  protected quitarFila(indice: number): void {
    this.filas.update((filas) => filas.filter((_, posicion) => posicion !== indice));
    this.programarProyeccion();
  }

  protected programarProyeccion(): void {
    if (!this.editable()) {
      return;
    }
    this.proyectando.set(true);
    this.cambios.next();
  }

  private solicitarProyeccion(): Observable<FormulaProyeccion> {
    const id = this.orden()?.id;
    if (!id) {
      return EMPTY;
    }
    return this.formulas.proyectar(id, {
      referencias: this.filas()
        .filter((fila) => fila.referencia_papa_id !== null)
        .map((fila) => ({
          referencia_papa_id: fila.referencia_papa_id as number,
          bultos_por_tanda: fila.bultos_por_tanda,
        })),
      usar_sugerencia: false,
    });
  }

  protected usarSugerencia(): void {
    const id = this.orden()?.id;
    if (!id) {
      return;
    }
    this.proyectando.set(true);
    this.formulas
      .proyectar(id, { referencias: [], usar_sugerencia: true })
      .subscribe({
        next: (proyeccion) => {
          this.proyeccion.set(proyeccion);
          this.filas.set(
            proyeccion.referencias.map((fila) => ({
              referencia_papa_id: fila.referencia_id,
              bultos_por_tanda: fila.bultos_por_tanda,
            })),
          );
          this.proyectando.set(false);
        },
        error: (respuesta: HttpErrorResponse) => {
          this.proyectando.set(false);
          this.advertencias.set([this.mensajeError(respuesta)]);
        },
      });
  }

  protected guardar(): void {
    const id = this.orden()?.id;
    if (!id || !this.puedeGuardar()) {
      return;
    }
    const confirmado = window.confirm(
      'La fórmula se enviará a horno. Mientras la orden no inicie puedes corregirla; al iniciar quedará congelada.',
    );
    if (!confirmado) {
      return;
    }

    this.guardando.set(true);
    this.advertencias.set([]);
    this.formulas
      .guardar(id, {
        referencias: this.filas().map((fila) => ({
          referencia_papa_id: fila.referencia_papa_id as number,
          bultos_por_tanda: fila.bultos_por_tanda,
        })),
        notas: this.notas.trim() || null,
      })
      .subscribe({
        next: (formula) => {
          this.formula.set(formula);
          this.notas = formula.notas ?? '';
          this.filas.set(
            formula.referencias.map((fila) => ({
              referencia_papa_id: fila.referencia_id,
              bultos_por_tanda: fila.bultos_por_tanda,
            })),
          );
          this.advertencias.set(formula.advertencias);
          this.guardando.set(false);
          this.avisos.exito('Fórmula guardada. Operarios y supervisor notificados.');
          this.programarProyeccion();
        },
        error: (respuesta: HttpErrorResponse) => {
          this.guardando.set(false);
          this.advertencias.set([this.mensajeError(respuesta)]);
        },
      });
  }

  protected claseDiferencia(): string {
    const proy = this.proyeccion();
    if (!proy) {
      return 'text-slate-400';
    }
    return Math.abs(proy.diferencia_pct) <= 5 ? 'text-emerald-700' : 'text-amber-700';
  }

  private mensajeError(respuesta: HttpErrorResponse): string {
    const detalle = (respuesta.error as { detail?: string } | null)?.detail;
    return detalle ?? 'No se pudo completar la operación. Intenta de nuevo.';
  }
}
