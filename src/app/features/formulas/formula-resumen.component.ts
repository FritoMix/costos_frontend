import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { EstadoFormula, Formula } from '../../core/modelos/formula.model';

const ETIQUETAS_ESTADO: Record<EstadoFormula, { texto: string; clases: string }> = {
  sin_formula: { texto: 'Por definir', clases: 'bg-amber-50 text-amber-800 ring-amber-500/20' },
  lista: { texto: 'Lista', clases: 'bg-emerald-50 text-emerald-800 ring-emerald-500/20' },
  en_produccion: { texto: 'Congelada', clases: 'bg-sky-50 text-sky-800 ring-sky-500/20' },
  finalizada: { texto: 'Finalizada', clases: 'bg-calido-100 text-stone-700 ring-calido-300/30' },
  cancelada: { texto: 'Cancelada', clases: 'bg-rose-50 text-rose-700 ring-rose-500/20' },
  no_aplica: { texto: 'No aplica', clases: 'bg-calido-100 text-stone-600 ring-calido-300/30' },
};

/**
 * Resumen de solo lectura de una fórmula.
 *
 * Lo comparten el detalle de la orden, el asistente de horno y el detalle de
 * Bodega. No conoce endpoints ni reglas: solo pinta lo que devuelve la API.
 */
@Component({
  selector: 'app-formula-resumen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <div class="space-y-4" data-testid="formula-resumen">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset"
          [class]="etiqueta().clases"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-current opacity-80"></span>
          {{ etiqueta().texto }}
        </span>
        @if (formula().estado !== 'sin_formula' && formula().estado !== 'no_aplica') {
          <span class="text-xs font-semibold text-slate-500">
            {{ formula().total_bultos_producidos | number: '1.0-0' }} /
            {{ formula().total_bultos_planificados | number: '1.0-0' }} bultos
            · {{ formula().tandas_registradas }} /
            {{ formula().tandas_programadas ?? '—' }} tandas
          </span>
        }
      </div>

      @if (formula().estado === 'sin_formula' || formula().estado === 'no_aplica') {
        <p class="rounded-2xl bg-calido-50 px-4 py-3 text-sm font-medium text-stone-600">
          {{ formula().estado === 'no_aplica'
            ? 'Orden histórica: se produce con el registro de horno anterior, sin fórmula por orden.'
            : 'Bodega todavía no definió la mezcla de esta orden.' }}
        </p>
      } @else {
        @if (formula().avance_bultos_porcentaje !== null) {
          <div class="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              class="h-full rounded-full bg-gradient-to-r from-sky-400 to-marca-600 transition-all duration-500"
              [style.width.%]="min(100, formula().avance_bultos_porcentaje ?? 0)"
            ></div>
          </div>
        }

        <div class="overflow-x-auto">
          <table class="w-full min-w-125 text-left text-sm">
            <thead class="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th class="py-2 pr-3">Referencia</th>
                <th class="px-3 py-2 text-right">%</th>
                <th class="px-3 py-2 text-right">Bultos/tanda</th>
                @if (mostrarProducido() && !compacto()) {
                  <th class="px-3 py-2 text-right">Planificados</th>
                  <th class="px-3 py-2 text-right">Producidos</th>
                  <th class="px-3 py-2 text-right">Restantes</th>
                }
                <th class="px-3 py-2 text-right">Kg crudos</th>
                <th class="py-2 pl-3 text-right">Kg fritos</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (fila of formula().referencias; track fila.referencia_id) {
                <tr [attr.data-testid]="'formula-referencia-' + fila.referencia_id">
                  <td class="py-2.5 pr-3">
                    <p class="font-bold text-slate-800">{{ fila.nombre }}</p>
                    @if (fila.tipo) {
                      <p class="text-[11px] font-medium text-slate-400">{{ fila.tipo }}</p>
                    }
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-slate-600">
                    {{ fila.porcentaje_produccion_pct | number: '1.0-1' }} %
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono font-bold text-slate-800">
                    {{ fila.bultos_por_tanda }}
                  </td>
                  @if (mostrarProducido() && !compacto()) {
                    <td class="px-3 py-2.5 text-right font-mono text-slate-600">
                      {{ fila.bultos_planificados }}
                    </td>
                    <td class="px-3 py-2.5 text-right font-mono text-slate-600">
                      {{ fila.bultos_producidos | number: '1.0-0' }}
                    </td>
                    <td class="px-3 py-2.5 text-right font-mono font-bold"
                        [class]="fila.bultos_restantes > 0 ? 'text-emerald-700' : 'text-slate-400'">
                      {{ fila.bultos_restantes | number: '1.0-0' }}
                    </td>
                  }
                  <td class="px-3 py-2.5 text-right font-mono text-slate-600">
                    {{ fila.kg_crudos_por_tanda | number: '1.0-2' }}
                  </td>
                  <td class="py-2.5 pl-3 text-right font-mono text-slate-600">
                    {{ fila.kg_fritos_por_tanda | number: '1.0-2' }}
                  </td>
                </tr>
              }
            </tbody>
            <tfoot class="border-t border-slate-200 text-sm font-bold text-slate-800">
              <tr>
                <td class="py-2.5 pr-3">Total por tanda</td>
                <td class="px-3 py-2.5"></td>
                <td class="px-3 py-2.5 text-right font-mono" data-testid="formula-total-tanda">
                  {{ formula().total_bultos_por_tanda }}
                </td>
                @if (mostrarProducido() && !compacto()) {
                  <td class="px-3 py-2.5 text-right font-mono">
                    {{ formula().total_bultos_planificados }}
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono">
                    {{ formula().total_bultos_producidos | number: '1.0-0' }}
                  </td>
                  <td class="px-3 py-2.5"></td>
                }
                <td class="px-3 py-2.5 text-right font-mono">
                  {{ formula().total_kg_crudos | number: '1.0-2' }}
                </td>
                <td class="py-2.5 pl-3 text-right font-mono">
                  {{ formula().total_kg_fritos_estimados | number: '1.0-2' }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        @if (formula().notas) {
          <p class="rounded-2xl bg-sky-50/60 px-4 py-2.5 text-xs font-medium text-sky-900">
            <span class="font-bold">Notas de Bodega:</span> {{ formula().notas }}
          </p>
        }
      }
    </div>
  `,
})
export class FormulaResumenComponent {
  readonly formula = input.required<Formula>();
  readonly modo = input<'completo' | 'compacto'>('completo');
  readonly mostrarProducido = input(true);

  protected readonly compacto = computed(() => this.modo() === 'compacto');
  protected readonly etiqueta = computed(() => ETIQUETAS_ESTADO[this.formula().estado]);

  protected min(a: number, b: number): number {
    return Math.min(a, b);
  }
}
