import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import type { Notificacion } from '../core/modelos/notificacion.model';
import { AuthService } from '../core/servicios/auth.service';
import { NotificacionesPlantaService } from '../core/servicios/notificaciones-planta.service';

/**
 * Aviso de planta en grande, en el centro de la pantalla, cuando llega uno
 * nuevo (además de la sirena y la campana). Pensado para quien no está
 * mirando la pantalla: letra grande y dos botones claros.
 */
@Component({
  selector: 'app-aviso-grande',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (aviso(); as a) {
      <div
        class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm"
        role="alertdialog"
        aria-modal="true"
        data-testid="aviso-grande"
      >
        <div
          class="anim-entrada w-full max-w-md overflow-hidden rounded-3xl bg-white text-center shadow-2xl"
        >
          <div class="px-6 pb-5 pt-8" [class]="estilo().fondo">
            <span
              class="mx-auto flex h-20 w-20 animate-pulse items-center justify-center rounded-full text-4xl shadow-lg"
              [class]="estilo().circulo"
              aria-hidden="true"
              >{{ estilo().icono }}</span
            >
            <h2 class="mt-5 text-2xl font-bold tracking-tight text-slate-900">{{ a.titulo }}</h2>
            <p class="mx-auto mt-2 max-w-sm text-base font-medium text-slate-600">
              {{ a.mensaje }}
            </p>
          </div>
          <div class="flex flex-wrap justify-center gap-3 px-6 py-5">
            @if (a.tipo === 'recordar_formula_noche') {
              <button
                type="button"
                (click)="irANoche()"
                class="min-w-36 rounded-2xl bg-marca-700 px-5 py-3.5 text-base font-semibold text-white shadow-md hover:bg-marca-800"
              >
                Dejar la fórmula
              </button>
            }
            @if (a.orden_id) {
              <button
                type="button"
                (click)="abrir(a)"
                class="min-w-36 rounded-2xl bg-marca-700 px-5 py-3.5 text-base font-semibold text-white shadow-md hover:bg-marca-800"
              >
                {{ textoBoton(a) }}
              </button>
            }
            <button
              type="button"
              (click)="servicio.cerrarDestacado()"
              class="min-w-36 rounded-2xl border-2 border-slate-200 px-5 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AvisoGrandeComponent {
  protected readonly servicio = inject(NotificacionesPlantaService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly aviso = this.servicio.destacado;

  protected readonly estilo = computed(() => {
    switch (this.aviso()?.tipo) {
      case 'produccion_por_terminar':
        return { fondo: 'bg-amber-50', circulo: 'bg-amber-200', icono: '⏰' };
      case 'produccion_terminada':
        return { fondo: 'bg-rose-50', circulo: 'bg-rose-200', icono: '🛑' };
      case 'orden_cerrada_sola':
        return { fondo: 'bg-emerald-50', circulo: 'bg-emerald-200', icono: '✅' };
      case 'recordar_formula_noche':
        return { fondo: 'bg-indigo-50', circulo: 'bg-indigo-200', icono: '🌙' };
      case 'formula_lista':
        return { fondo: 'bg-emerald-50', circulo: 'bg-emerald-200', icono: '🧪' };
      default:
        return { fondo: 'bg-marca-50', circulo: 'bg-marca-200', icono: '🆕' };
    }
  });

  /** Mismo destino que la campana: Bodega a la fórmula, horno a su lista, el resto a la orden. */
  private ruta(a: Notificacion): string[] {
    if (a.tipo === 'orden_para_bodega' && (this.auth.esAdmin() || this.auth.esBodeguero())) {
      return ['/formula-produccion/ordenes', String(a.orden_id)];
    }
    if (this.auth.esOperarioHorno()) {
      return ['/horno'];
    }
    if (this.auth.esOperarioSaborizado()) {
      return ['/saborizado'];
    }
    return ['/ordenes', String(a.orden_id)];
  }

  protected textoBoton(a: Notificacion): string {
    if (a.tipo === 'orden_para_bodega' && (this.auth.esAdmin() || this.auth.esBodeguero())) {
      return 'Definir fórmula';
    }
    return this.auth.esOperarioHorno() || this.auth.esOperarioSaborizado()
      ? 'Ir a mi pantalla'
      : 'Ver la orden';
  }

  protected irANoche(): void {
    this.servicio.cerrarDestacado();
    void this.router.navigate(['/formula-produccion/noche']);
  }

  protected abrir(a: Notificacion): void {
    const destino = this.ruta(a);
    this.servicio.cerrarDestacado();
    void this.router.navigate(destino);
  }
}
