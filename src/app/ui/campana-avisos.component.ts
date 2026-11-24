import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Notificacion } from '../core/modelos/notificacion.model';
import { AuthService } from '../core/servicios/auth.service';
import { NotificacionesPlantaService } from '../core/servicios/notificaciones-planta.service';
import { IconoComponent, type NombreIcono } from './icono.component';

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
  imports: [IconoComponent, RouterLink],
  template: `
    <div class="relative">
      <button
        type="button"
        (click)="alternar()"
        class="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-200 transition-colors duration-150 hover:bg-white hover:text-white focus-visible:outline-2 focus-visible:outline-marca-300"
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
            class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-extrabold text-white ring-2 ring-marca-950"
          >
            {{ servicio.sinLeer() }}
          </span>
        }
      </button>

      @if (abierto()) {
        <!-- Capa para cerrar al tocar fuera -->
        <div class="fixed inset-0 z-40" (click)="abierto.set(false)"></div>

        <div
          class="fixed inset-x-3 top-17 z-50 mt-2 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl anim-bajar"
          style="backdrop-filter: blur(16px) saturate(1.2);"
        >
          <header class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <p class="text-sm font-extrabold text-slate-900">Avisos de planta</p>
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

          <div class="max-h-[min(24rem,55dvh)] overflow-y-auto">
            @for (aviso of servicio.pendientes(); track aviso.id) {
              <article class="flex gap-3 border-b border-slate-200 px-4 py-3.5 last:border-0 transition-colors duration-150 hover:bg-marca-50">
                <span [class]="claseIcono(aviso.tipo)">
                  <app-icono [nombre]="icono(aviso.tipo)" [tamano]="18" />
                </span>
                <div class="min-w-0 flex-1 wrap-anywhere">
                  <p class="text-sm font-extrabold text-slate-900">{{ aviso.titulo }}</p>
                  <p class="mt-0.5 text-xs font-medium text-slate-600">{{ aviso.mensaje }}</p>
                  <div class="mt-2 flex items-center gap-3">
                    <a
                      [routerLink]="rutaAviso(aviso)"
                      (click)="abierto.set(false)"
                      class="text-xs font-bold text-marca-700 hover:underline"
                    >
                      {{ etiquetaEnlace(aviso.tipo) }}
                    </a>
                    <button
                      type="button"
                      (click)="servicio.marcarLeida(aviso.id)"
                      class="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      Listo
                    </button>
                  </div>
                </div>
              </article>
            } @empty {
              <p class="px-4 py-10 text-center text-sm font-medium text-slate-400">
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
  private readonly auth = inject(AuthService);
  protected readonly abierto = signal(false);

  protected icono(tipo: string): NombreIcono {
    switch (tipo) {
      case 'formula_lista':
        return 'checkCirculo';
      case 'produccion_por_terminar':
        return 'reloj';
      case 'produccion_terminada':
        return 'alto';
      case 'orden_cerrada_sola':
        return 'candado';
      case 'recordar_formula_noche':
        return 'luna';
      case 'recuperar_password':
        return 'llave';
      default:
        return 'info';
    }
  }

  /**
   * A dónde lleva cada aviso según el rol: Bodega va al editor de la fórmula;
   * el operario de horno, a su lista; el resto, al detalle de la orden.
   */
  protected rutaAviso(aviso: Notificacion): string[] {
    const ordenId = aviso.orden_id;
    if (aviso.tipo === 'recordar_formula_noche') {
      return ['/formula-produccion/noche'];
    }
    if (aviso.tipo === 'recuperar_password') {
      return [this.auth.esAdmin() ? '/usuarios' : '/recuperar-clave'];
    }
    if (aviso.tipo === 'orden_para_bodega' && (this.auth.esAdmin() || this.auth.esBodeguero())) {
      return ['/formula-produccion/ordenes', String(ordenId)];
    }
    if (aviso.tipo === 'formula_lista' && this.auth.esOperarioHorno()) {
      return ['/horno'];
    }
    return ['/ordenes', String(ordenId)];
  }

  protected etiquetaEnlace(tipo: string): string {
    if (tipo === 'recordar_formula_noche') {
      return 'Dejar la fórmula';
    }
    if (tipo === 'recuperar_password') {
      return 'Dar contraseña temporal';
    }
    if (tipo === 'orden_para_bodega' && (this.auth.esAdmin() || this.auth.esBodeguero())) {
      return 'Definir fórmula';
    }
    if (tipo === 'formula_lista' && this.auth.esOperarioHorno()) {
      return 'Ir a horno';
    }
    return 'Ver orden';
  }

  protected alternar(): void {
    this.abierto.update((v) => !v);
  }

  protected claseIcono(tipo: string): string {
    const base = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base';
    switch (tipo) {
      case 'produccion_por_terminar':
        return `${base} bg-amber-100/80`;
      case 'formula_lista':
        return `${base} bg-emerald-100/80`;
      default:
        return `${base} bg-marca-100/80`;
    }
  }
}
