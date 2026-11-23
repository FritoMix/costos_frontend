import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import type { ReferenciaPapa } from '../../core/modelos/bodega.model';
import type { FormulaNoche } from '../../core/modelos/formula.model';
import { BodegaService } from '../../core/servicios/bodega.service';
import { FormulaService } from '../../core/servicios/formula.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';

interface FilaEdicion {
  referencia_papa_id: number | null;
  bultos_por_tanda: number | null;
}

/**
 * Fórmula de la noche: antes de irse, Bodega deja por horno la papa que
 * despachó. Las órdenes de la noche sin fórmula del producto la toman solas
 * y al otro día Bodega las confirma.
 */
@Component({
  selector: 'app-formula-noche',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, BotonComponent, CargandoComponent],
  template: `
    <div class="pagina-contenido" data-testid="formula-noche">
      <header class="border-b border-slate-200/80 pb-5">
        <a
          routerLink="/formula-produccion"
          class="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 transition hover:text-sky-800"
          >← Volver a Fórmula de producción</a
        >
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          🌙 Fórmula de la noche
        </h1>
        <p class="mt-1 max-w-3xl text-sm font-medium text-slate-500">
          Deja por horno la papa que despachaste para la noche (bultos por tanda). Si en la noche se
          abre una orden cuyo producto no tiene fórmula activa, la toma sola; mañana la confirmas o
          la corriges en la orden.
        </p>
      </header>

      @if (cargando()) {
        <app-cargando texto="Cargando hornos…" />
      } @else {
        <div class="grid gap-4 lg:grid-cols-2">
          @for (horno of hornos(); track horno.horno_id) {
            <section
              class="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs"
              [attr.data-testid]="'noche-horno-' + horno.horno_id"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h2 class="text-lg font-extrabold text-slate-900">{{ horno.horno }}</h2>
                  @if (horno.fecha_actualizacion) {
                    <p class="text-xs font-medium text-slate-500">
                      Dejada por {{ horno.actualizado_por || '—' }} ·
                      {{ horno.fecha_actualizacion | date: 'dd/MM HH:mm' }}
                    </p>
                  } @else {
                    <p class="text-xs font-semibold text-amber-700">Sin fórmula de la noche</p>
                  }
                </div>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {{ total(horno.horno_id) }} bultos por tanda
                </span>
              </div>

              <div class="mt-4 space-y-2">
                @for (fila of filasDe(horno.horno_id); track $index; let i = $index) {
                  <div class="flex items-center gap-2">
                    <select
                      class="campo flex-1"
                      [attr.aria-label]="'Referencia ' + (i + 1)"
                      [value]="fila.referencia_papa_id ?? ''"
                      (change)="
                        cambiar(horno.horno_id, i, 'referencia_papa_id', $any($event.target).value)
                      "
                    >
                      <option value="">Elige la papa…</option>
                      @for (ref of referencias(); track ref.id) {
                        <option [value]="ref.id" [selected]="ref.id === fila.referencia_papa_id">
                          {{ ref.nombre }}
                        </option>
                      }
                    </select>
                    <input
                      type="number"
                      inputmode="numeric"
                      min="1"
                      step="1"
                      class="campo w-28 font-mono"
                      placeholder="Bultos"
                      [attr.aria-label]="'Bultos por tanda ' + (i + 1)"
                      [value]="fila.bultos_por_tanda ?? ''"
                      (input)="
                        cambiar(horno.horno_id, i, 'bultos_por_tanda', $any($event.target).value)
                      "
                    />
                    <button
                      type="button"
                      class="rounded-xl px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50"
                      (click)="quitar(horno.horno_id, i)"
                      [attr.aria-label]="'Quitar referencia ' + (i + 1)"
                    >
                      ✕
                    </button>
                  </div>
                }
                <button
                  type="button"
                  class="text-sm font-bold text-sky-700 hover:text-sky-900"
                  (click)="agregar(horno.horno_id)"
                >
                  + Agregar papa
                </button>
              </div>

              <div class="mt-4 flex justify-end gap-2">
                <app-boton
                  variante="secundario"
                  [cargando]="guardando() === horno.horno_id"
                  (click)="guardar(horno.horno_id, true)"
                  >Quitar fórmula</app-boton
                >
                <app-boton
                  [cargando]="guardando() === horno.horno_id"
                  [testId]="'guardar-noche-' + horno.horno_id"
                  (click)="guardar(horno.horno_id, false)"
                  >Guardar</app-boton
                >
              </div>
            </section>
          }
        </div>
      }
    </div>
  `,
})
export class FormulaNochePage {
  private readonly formulas = inject(FormulaService);
  private readonly bodega = inject(BodegaService);
  private readonly avisos = inject(NotificacionesService);

  protected readonly cargando = signal(true);
  protected readonly guardando = signal<number | null>(null);
  protected readonly hornos = signal<FormulaNoche[]>([]);
  protected readonly referencias = signal<ReferenciaPapa[]>([]);
  private readonly edicion = signal<Record<number, FilaEdicion[]>>({});

  constructor() {
    forkJoin({
      hornos: this.formulas.listarNoche(),
      referencias: this.bodega.listar(true, true),
    }).subscribe({
      next: ({ hornos, referencias }) => {
        this.referencias.set(referencias);
        this.cargarHornos(hornos);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  private cargarHornos(hornos: FormulaNoche[]): void {
    this.hornos.set(hornos);
    const edicion: Record<number, FilaEdicion[]> = {};
    for (const horno of hornos) {
      edicion[horno.horno_id] = horno.filas.length
        ? horno.filas.map((f) => ({
            referencia_papa_id: f.referencia_papa_id,
            bultos_por_tanda: f.bultos_por_tanda,
          }))
        : [{ referencia_papa_id: null, bultos_por_tanda: null }];
    }
    this.edicion.set(edicion);
  }

  protected filasDe(hornoId: number): FilaEdicion[] {
    return this.edicion()[hornoId] ?? [];
  }

  protected total(hornoId: number): number {
    return this.filasDe(hornoId).reduce((suma, f) => suma + (f.bultos_por_tanda ?? 0), 0);
  }

  protected cambiar(hornoId: number, i: number, campo: keyof FilaEdicion, valor: string): void {
    const numero = valor === '' ? null : Number(valor);
    this.edicion.update((e) => ({
      ...e,
      [hornoId]: e[hornoId].map((f, j) => (j === i ? { ...f, [campo]: numero } : f)),
    }));
  }

  protected agregar(hornoId: number): void {
    this.edicion.update((e) => ({
      ...e,
      [hornoId]: [...(e[hornoId] ?? []), { referencia_papa_id: null, bultos_por_tanda: null }],
    }));
  }

  protected quitar(hornoId: number, i: number): void {
    this.edicion.update((e) => ({ ...e, [hornoId]: e[hornoId].filter((_, j) => j !== i) }));
  }

  protected guardar(hornoId: number, vaciar: boolean): void {
    const filas = vaciar
      ? []
      : this.filasDe(hornoId).filter((f) => f.referencia_papa_id && (f.bultos_por_tanda ?? 0) > 0);
    if (!vaciar && filas.length === 0) {
      this.avisos.error('Agrega al menos una papa con sus bultos por tanda.');
      return;
    }
    if (filas.some((f) => !Number.isInteger(f.bultos_por_tanda))) {
      this.avisos.error('Los bultos por tanda deben ser enteros.');
      return;
    }
    this.guardando.set(hornoId);
    this.formulas
      .guardarNoche(
        hornoId,
        filas.map((f) => ({
          referencia_papa_id: f.referencia_papa_id!,
          bultos_por_tanda: f.bultos_por_tanda!,
        })),
      )
      .subscribe({
        next: (guardada) => {
          this.guardando.set(null);
          this.cargarHornos(this.hornos().map((h) => (h.horno_id === hornoId ? guardada : h)));
          this.avisos.exito(
            vaciar ? 'Fórmula de la noche quitada.' : 'Fórmula de la noche guardada.',
          );
        },
        error: () => this.guardando.set(null),
      });
  }
}
