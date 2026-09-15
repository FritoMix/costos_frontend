import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NotificacionesService } from '../core/servicios/notificaciones.service';

/**
 * Toast flotante futurista cálido con glassmorphism de alta visibilidad.
 */
@Component({
  selector: 'app-avisos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2.5 px-4 sm:right-5 sm:bottom-5 sm:left-auto sm:items-end"
      aria-live="polite"
    >
      @for (aviso of servicio.avisos(); track aviso.id) {
        <div
          class="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border px-4.5 py-3.5 shadow-xl transition-all anim-deslizar"
          style="backdrop-filter: blur(12px) saturate(1.2);"
          [class]="estilo(aviso.tipo)"
        >
          @if (aviso.tipo === 'exito') {
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </span>
          } @else if (aviso.tipo === 'error') {
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-rose-50 text-rose-700">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </span>
          } @else {
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </span>
          }
          <p class="flex-1 text-sm font-semibold tracking-tight">{{ aviso.mensaje }}</p>
          <button
            type="button"
            class="shrink-0 rounded-lg p-1 text-stone-400 hover:bg-black/5 hover:text-stone-700 transition-all duration-200"
            (click)="servicio.cerrar(aviso.id)"
            aria-label="Cerrar aviso"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class AvisosComponent {
  protected readonly servicio = inject(NotificacionesService);

  protected estilo(tipo: string): string {
    switch (tipo) {
      case 'exito':
        return 'border-emerald-200/60 bg-emerald-50/90 text-emerald-950 shadow-emerald-500/10';
      case 'error':
        return 'border-rose-200/60 bg-rose-50/90 text-rose-950 shadow-rose-500/10';
      default:
        return 'border-calido-200/60 bg-white/90 text-stone-900 shadow-amber-500/5';
    }
  }
}
