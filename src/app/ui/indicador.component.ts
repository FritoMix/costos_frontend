import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type TonoIndicador = 'neutral' | 'marca' | 'verde' | 'azul' | 'ambar' | 'morado' | 'rojo';

/**
 * KPI Métrico Futurista: visualización de datos numéricos con tipografía
 * monoespaciada tabular de alta legibilidad, icono temático y estado descriptivo.
 */
@Component({
  selector: 'app-indicador',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <div
      class="group relative flex flex-col justify-between overflow-hidden rounded-3xl border bg-white/70 p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
      style="backdrop-filter: blur(8px);"
      [class]="bordeContenedor()"
    >
      <!-- Hover glow effect -->
      <div class="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-500"
           [style]="glowStyle()"></div>

      <!-- Top header con título y badge de tono -->
      <div class="flex items-start justify-between gap-3">
        <p class="text-xs font-bold uppercase tracking-wider text-stone-500 leading-tight">
          {{ nombre() }}
        </p>
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-md"
          [class]="fondoIcono()"
        >
          <span [class]="colorIcono()" [innerHTML]="svgIcono()"></span>
        </div>
      </div>

      <!-- Valor principal con unidad -->
      <div class="mt-4">
        @if (valor() === null || valor() === undefined) {
          <div class="flex items-baseline gap-2">
            <span class="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-stone-300">—</span>
          </div>
          @if (faltante()) {
            <p class="mt-2 text-xs font-medium text-stone-400 bg-calido-50 px-2.5 py-1 rounded-lg border border-calido-100 inline-block">
              {{ faltante() }}
            </p>
          }
        } @else {
          <div class="flex items-baseline gap-2 flex-wrap">
            <span class="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-stone-900 tabular-nums">
              {{ valor() | number: '1.0-2' }}
            </span>
            @if (unidad()) {
              <span class="text-xs font-bold uppercase tracking-wider text-stone-500 bg-calido-100/60 px-2 py-0.5 rounded-lg border border-calido-200/40">
                {{ unidad() }}
              </span>
            }
          </div>
        }
      </div>

      @if (subtexto()) {
        <p class="mt-3 text-xs text-stone-500 font-medium border-t border-calido-100/60 pt-2.5">
          {{ subtexto() }}
        </p>
      }
    </div>
  `,
})
export class IndicadorComponent {
  readonly nombre = input.required<string>();
  readonly valor = input<number | null | undefined>(null);
  readonly unidad = input('');
  readonly faltante = input('');
  readonly subtexto = input('');
  readonly tono = input<TonoIndicador>('neutral');
  readonly icono = input<string>('');

  protected readonly glowStyle = computed(() => {
    switch (this.tono()) {
      case 'marca':
        return 'background: radial-gradient(circle, rgba(242,111,19,0.3) 0%, transparent 70%);';
      case 'verde':
        return 'background: radial-gradient(circle, rgba(52,211,153,0.3) 0%, transparent 70%);';
      case 'azul':
        return 'background: radial-gradient(circle, rgba(56,189,248,0.3) 0%, transparent 70%);';
      case 'ambar':
        return 'background: radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%);';
      case 'morado':
        return 'background: radial-gradient(circle, rgba(129,140,248,0.3) 0%, transparent 70%);';
      case 'rojo':
        return 'background: radial-gradient(circle, rgba(244,63,94,0.3) 0%, transparent 70%);';
      default:
        return 'background: radial-gradient(circle, rgba(180,140,100,0.2) 0%, transparent 70%);';
    }
  });

  protected readonly bordeContenedor = computed(() => {
    switch (this.tono()) {
      case 'marca':
        return 'border-calido-200/60 hover:border-marca-300/60';
      case 'verde':
        return 'border-calido-200/60 hover:border-emerald-300/60';
      case 'azul':
        return 'border-calido-200/60 hover:border-sky-300/60';
      case 'ambar':
        return 'border-calido-200/60 hover:border-amber-300/60';
      case 'morado':
        return 'border-calido-200/60 hover:border-indigo-300/60';
      case 'rojo':
        return 'border-calido-200/60 hover:border-rose-300/60';
      default:
        return 'border-calido-200/60 hover:border-calido-300';
    }
  });

  protected readonly fondoIcono = computed(() => {
    switch (this.tono()) {
      case 'marca':
        return 'bg-gradient-to-br from-marca-50 to-amber-50 border border-marca-200/40';
      case 'verde':
        return 'bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/40';
      case 'azul':
        return 'bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200/40';
      case 'ambar':
        return 'bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200/40';
      case 'morado':
        return 'bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-200/40';
      case 'rojo':
        return 'bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200/40';
      default:
        return 'bg-gradient-to-br from-calido-100 to-calido-50 border border-calido-200/40';
    }
  });

  protected readonly colorIcono = computed(() => {
    switch (this.tono()) {
      case 'marca':
        return 'text-marca-600';
      case 'verde':
        return 'text-emerald-600';
      case 'azul':
        return 'text-sky-600';
      case 'ambar':
        return 'text-amber-600';
      case 'morado':
        return 'text-indigo-600';
      case 'rojo':
        return 'text-rose-600';
      default:
        return 'text-stone-500';
    }
  });

  protected readonly svgIcono = computed(() => {
    const custom = this.icono();
    if (custom) return custom;

    const nombreLow = this.nombre().toLowerCase();
    if (nombreLow.includes('orden')) {
      return '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>';
    }
    if (nombreLow.includes('cruda') || nombreLow.includes('materia')) {
      return '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>';
    }
    if (nombreLow.includes('frita') || nombreLow.includes('terminado')) {
      return '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
    }
    if (nombreLow.includes('aceite')) {
      return '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>';
    }
    if (nombreLow.includes('rendimiento')) {
      return '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>';
    }
    if (nombreLow.includes('absorción') || nombreLow.includes('absorcion')) {
      return '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>';
    }
    if (nombreLow.includes('desperdicio') || nombreLow.includes('merma')) {
      return '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>';
    }

    return '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>';
  });
}
