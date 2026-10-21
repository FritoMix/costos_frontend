import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ActualizacionesService } from '../core/servicios/actualizaciones.service';

/**
 * Aviso flotante de nueva version. Se dibuja en la raiz para cubrir tambien
 * el login, antes de que exista el marco de la aplicacion.
 */
@Component({
  selector: 'app-aviso-actualizacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (servicio.actualizacionLista()) {
      <div
        class="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4"
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        data-testid="aviso-actualizacion"
      >
        <div
          class="pointer-events-auto flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-sky-200/80 bg-white/95 px-4 py-3.5 shadow-xl sm:flex-row sm:items-center"
          style="backdrop-filter: blur(14px) saturate(1.2);"
        >
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-blue-50 text-sky-700"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M16.023 9.348h4.992V4.356m-4.992 4.992l-3.181-3.183a8.25 8.25 0 00-13.803 3.7m0 0H3.03v4.992m-3.03-4.992l3.181 3.183a8.25 8.25 0 0013.803-3.7"
              />
            </svg>
          </span>

          <div class="min-w-0 flex-1">
            <p class="text-sm font-extrabold text-slate-900">Nueva versión disponible</p>
            <p class="mt-0.5 text-xs font-medium leading-relaxed text-slate-600">
              La aplicación se actualizará automáticamente en
              <span class="font-mono font-black text-sky-700">
                {{ servicio.segundosRestantes() }} s
              </span>
              .
            </p>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <button
              type="button"
              class="rounded-xl px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100"
              (click)="servicio.posponer()"
              data-testid="posponer-actualizacion"
            >
              Más tarde
            </button>
            <button
              type="button"
              class="rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:from-sky-700 hover:to-blue-800"
              (click)="servicio.actualizarAhora()"
              data-testid="actualizar-ahora"
            >
              Actualizar ahora
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AvisoActualizacionComponent {
  protected readonly servicio = inject(ActualizacionesService);
}
