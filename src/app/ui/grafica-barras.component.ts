import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface BarraDato {
  etiqueta: string;
  valor: number;
  /** Cantidad programada (meta). Si viene del backend, se usa para colorear verde/rojo. */
  meta?: number | null;
}

/**
 * Gráfica de barras horizontales optimizada para producción industrial con diseño futurista cálido.
 *
 * Color de cada barra:
 *  - Verde  → el valor real alcanzó o superó la meta programada (meta cumplida al 100%)
 *  - Rojo   → el valor real no llegó a la meta
 *  - Neutro → no hay meta disponible (solo barras de distribución sin objetivo)
 */
@Component({
  selector: 'app-grafica-barras',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    @if (datos().length === 0) {
      <div class="py-8 text-center anim-entrada">
        <p class="text-sm font-medium text-stone-400">Todavía no hay datos para mostrar.</p>
      </div>
    } @else {
      <ul class="space-y-4 escalona">
        @for (dato of datos(); track dato.etiqueta) {
          <li class="group">
            <div class="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span class="font-semibold text-stone-800 tracking-tight group-hover:text-marca-700 transition-colors duration-200">{{ dato.etiqueta }}</span>
              <div class="flex items-center gap-2">
                <!-- Badge: muestra % de cumplimiento si hay meta, o % relativo si no hay -->
                @if (dato.meta != null && dato.meta > 0) {
                  <span
                    class="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg border shadow-2xs"
                    [class]="cumpleMeta(dato)
                      ? 'text-emerald-800 bg-emerald-50 border-emerald-200/60'
                      : 'text-red-800 bg-red-50 border-red-200/60'"
                  >
                    {{ pctCumplimiento(dato) | number: '1.0-1' }}%
                  </span>
                } @else {
                  <span class="text-xs font-mono font-bold text-slate-600 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200/60 shadow-2xs">
                    {{ porcentaje(dato.valor) | number: '1.0-1' }}%
                  </span>
                }
                <span class="font-mono font-bold text-stone-700 tabular-nums text-xs">
                  {{ dato.valor | number: '1.0-2' }} {{ unidad() }}
                </span>
              </div>
            </div>

            <!-- Barra: verde si cumple meta, rojo si no, gris neutro si sin meta -->
            <div class="h-3.5 w-full overflow-hidden rounded-full bg-slate-100/80 p-0.5 ring-1 ring-inset ring-slate-200/60 shadow-inner">
              <div
                class="h-full rounded-full transition-all duration-700 ease-out shadow-sm relative overflow-hidden"
                [class]="colorBarra(dato)"
                [style.width.%]="anchoBarra(dato)"
              >
                <div class="absolute inset-0 anim-shimmer"></div>
              </div>
            </div>

            <!-- Sub-etiqueta: muestra meta cuando aplica -->
            @if (dato.meta != null && dato.meta > 0) {
              <div class="mt-1 flex items-center gap-1.5">
                <span class="text-[10px] font-medium text-slate-400">
                  Meta: {{ dato.meta | number: '1.0-2' }} {{ unidad() }}
                </span>
                @if (cumpleMeta(dato)) {
                  <span class="text-[10px] font-bold text-emerald-600">✓ Cumplida</span>
                } @else {
                  <span class="text-[10px] font-bold text-red-500">✗ No cumplida</span>
                }
              </div>
            }
          </li>
        }
      </ul>
    }
  `,
})
export class GraficaBarrasComponent {
  readonly datos = input.required<BarraDato[]>();
  readonly unidad = input('kg');

  private readonly maximo = computed(() =>
    this.datos().reduce((mayor, dato) => Math.max(mayor, Number(dato.valor)), 0),
  );

  /** Porcentaje relativo al máximo del grupo (para barras sin meta). */
  protected porcentaje(valor: number): number {
    const maximo = this.maximo();
    return maximo > 0 ? (Number(valor) / maximo) * 100 : 0;
  }

  /** Porcentaje de cumplimiento real vs meta programada. */
  protected pctCumplimiento(dato: BarraDato): number {
    if (!dato.meta || Number(dato.meta) <= 0) return 0;
    return Math.min(100, (Number(dato.valor) / Number(dato.meta)) * 100);
  }

  /** ¿El valor real alcanzó o superó la meta? */
  protected cumpleMeta(dato: BarraDato): boolean {
    if (dato.meta == null || Number(dato.meta) <= 0) return false;
    return Number(dato.valor) >= Number(dato.meta);
  }

  /** Ancho de la barra: relativo a la meta si la hay, al máximo si no. */
  protected anchoBarra(dato: BarraDato): number {
    if (dato.meta != null && Number(dato.meta) > 0) {
      return Math.min(100, (Number(dato.valor) / Number(dato.meta)) * 100);
    }
    return this.porcentaje(dato.valor);
  }

  /** Clase de color de la barra según cumplimiento. */
  protected colorBarra(dato: BarraDato): string {
    if (dato.meta != null && Number(dato.meta) > 0) {
      return this.cumpleMeta(dato)
        ? 'bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600'
        : 'bg-gradient-to-r from-red-400 via-rose-500 to-red-600';
    }
    // Sin meta: barra neutra (gris azulado)
    return 'bg-gradient-to-r from-slate-400 via-slate-500 to-slate-600';
  }
}

