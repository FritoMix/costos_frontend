import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NotificacionesPlantaService } from '../core/servicios/notificaciones-planta.service';

/**
 * Campana de avisos futurista cálida de la barra superior.
 *
 * Muestra cuántos avisos hay sin ver y, al tocarla, el detalle de cada uno
 * con acceso directo a la orden. La alarma sonora la dispara el servicio;
 * este componente solo pinta.
 */
@Component({
  selector: 'app-campana-avisos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="relative">
      <button
        type="button"
        (click)="alternar()"
        class="relative flex h-10 w-10 items-center justify-center rounded-xl border border-calido-200/80 bg-white/80 text-stone-500 transition-all duration-200 hover:bg-amber-50/60 hover:text-amber-700 hover:border-amber-300/50 active:scale-95"
        style="backdrop-filter: blur(4px);"
        [attr.aria-label]="'Avisos: ' + servicio.sinLeer() + ' sin leer'"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        @if (servicio.sinLeer() > 0) {
          <span
            class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-marca-500 px-1 text-[11px] font-extrabold text-white ring-2 ring-white anim-pulsar"
          >
            {{ servicio.sinLeer() }}
          </span>
        }
      </button>

      @if (abierto()) {
        <!-- Capa para cerrar al tocar fuera -->
        <div class="fixed inset-0 z-40" (click)="abierto.set(false)"></div>

        <div
          class="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-3xl border border-calido-200/60 bg-white/90 shadow-2xl anim-bajar sm:w-96"
          style="backdrop-filter: blur(16px) saturate(1.2);"
        >
          <header class="flex items-center justify-between border-b border-calido-100/80 px-4 py-3"
                  style="background: linear-gradient(135deg, rgba(250,245,238,0.8) 0%, rgba(255,249,240,0.6) 100%);">
            <p class="text-sm font-extrabold text-stone-900">Avisos de planta</p>
            @if (servicio.sinLeer() > 0) {
              <button
                type="button"
                (click)="servicio.marcarTodasLeidas()"
                class="text-xs font-bold text-marca-700 hover:underline"
              >
                Marcar todo como visto
              </button>
            }
          </header>

          <div class="max-h-96 overflow-y-auto">
            @for (aviso of servicio.pendientes(); track aviso.id) {
              <article class="flex gap-3 border-b border-calido-100/60 px-4 py-3.5 last:border-0 transition-colors duration-150 hover:bg-amber-50/30">
                <span [class]="claseIcono(aviso.tipo)">
                  {{ aviso.tipo === 'produccion_por_terminar' ? '⏰' : '🆕' }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-extrabold text-stone-900">{{ aviso.titulo }}</p>
                  <p class="mt-0.5 text-xs font-medium text-stone-600">{{ aviso.mensaje }}</p>
                  <div class="mt-2 flex items-center gap-3">
                    @if (aviso.orden_id) {
                      <a
                        [routerLink]="['/ordenes', aviso.orden_id]"
                        (click)="abierto.set(false)"
                        class="text-xs font-bold text-marca-700 hover:underline"
                      >
                        Ver orden
                      </a>
                    }
                    <button
                      type="button"
                      (click)="servicio.marcarLeida(aviso.id)"
                      class="text-xs font-bold text-stone-400 hover:text-stone-700 transition-colors"
                    >
                      Listo
                    </button>
                  </div>
                </div>
              </article>
            } @empty {
              <p class="px-4 py-10 text-center text-sm font-medium text-stone-400">
                No tienes avisos pendientes.
              </p>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class CampanaAvisosComponent {
  protected readonly servicio = inject(NotificacionesPlantaService);
  protected readonly abierto = signal(false);

  protected alternar(): void {
    this.abierto.update((v) => !v);
  }

  protected claseIcono(tipo: string): string {
    const base = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base';
    return tipo === 'produccion_por_terminar'
      ? `${base} bg-amber-100/80`
      : `${base} bg-marca-100/80`;
  }
}
