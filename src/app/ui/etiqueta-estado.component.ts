import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Pastilla de estado de producción con diseño futurista cálido de alta visibilidad
 * y soporte para indicador de pulso en vivo para órdenes activas.
 */
@Component({
  selector: 'app-etiqueta-estado',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-tight whitespace-nowrap select-none ring-1 ring-inset transition-all duration-200"
      [class]="clases()"
    >
      @if (estado() === 'en_produccion') {
        <span class="relative flex h-2 w-2" aria-hidden="true">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" style="box-shadow: 0 0 6px rgba(52,211,153,0.5);"></span>
        </span>
      } @else {
        <span class="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden="true"></span>
      }
      {{ texto() }}
    </span>
  `,
})
export class EtiquetaEstadoComponent {
  readonly estado = input.required<string>();
  readonly texto = input.required<string>();

  protected readonly clases = computed(() => {
    switch (this.estado()) {
      case 'en_produccion':
        return 'bg-emerald-50/80 text-emerald-800 ring-emerald-500/20';
      case 'pendiente':
        return 'bg-amber-50/80 text-amber-800 ring-amber-500/20';
      case 'finalizada':
        return 'bg-calido-100/60 text-stone-700 ring-calido-300/30';
      case 'cancelada':
        return 'bg-rose-50/80 text-rose-700 ring-rose-500/20';
      case 'exportacion':
        return 'bg-sky-50/80 text-sky-800 ring-sky-500/20';
      default:
        return 'bg-calido-100/60 text-stone-600 ring-calido-300/30';
    }
  });
}
