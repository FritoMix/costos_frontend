import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface BarraDato {
  etiqueta: string;
  valor: number;
}

/**
 * Gráfica de barras horizontales optimizada para producción industrial con diseño futurista cálido.
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
                <span class="text-xs font-mono font-bold text-marca-700 bg-gradient-to-r from-marca-50 to-amber-50 px-2.5 py-0.5 rounded-lg border border-marca-200/50 shadow-2xs">
                  {{ porcentaje(dato.valor) | number: '1.0-1' }}%
                </span>
                <span class="font-mono font-bold text-stone-700 tabular-nums text-xs">
                  {{ dato.valor | number: '1.0-2' }} {{ unidad() }}
                </span>
              </div>
            </div>
            <div class="h-3.5 w-full overflow-hidden rounded-full bg-calido-100/80 p-0.5 ring-1 ring-inset ring-calido-200/60 shadow-inner">
              <div
                class="h-full rounded-full bg-gradient-to-r from-marca-500 via-amber-500 to-orange-400 transition-all duration-700 ease-out shadow-sm relative overflow-hidden"
                [style.width.%]="porcentaje(dato.valor)"
              >
                <div class="absolute inset-0 anim-shimmer"></div>
              </div>
            </div>
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

  protected porcentaje(valor: number): number {
    const maximo = this.maximo();
    return maximo > 0 ? (Number(valor) / maximo) * 100 : 0;
  }
}
