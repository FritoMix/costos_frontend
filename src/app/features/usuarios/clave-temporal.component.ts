import { ChangeDetectionStrategy, Component, type ElementRef, effect, inject, input, signal, viewChild } from '@angular/core';

import type { Usuario } from '../../core/modelos/identidad.model';
import { UsuariosService } from '../../core/servicios/usuarios.service';
import { ConfirmarComponent } from '../../ui/confirmar.component';

/**
 * Botón «Contraseña temporal» de un usuario (V21). Genera 8 números que se
 * muestran UNA sola vez para dictárselos a la persona; al entrar con ellos
 * la app le pide crear su contraseña propia.
 */
@Component({
  selector: 'app-clave-temporal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmarComponent],
  template: `
    <button
      type="button"
      class="rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-bold text-amber-800 shadow-2xs transition hover:bg-amber-50"
      [attr.data-testid]="'clave-temporal-' + usuario().nombre_usuario"
      (click)="preguntando.set(true)"
    >
      Contraseña temporal
    </button>

    <app-confirmar
      [abierto]="preguntando()"
      [titulo]="'¿Dar contraseña temporal a ' + usuario().nombre_completo + '?'"
      mensaje="Su contraseña actual deja de servir y se cierran sus sesiones abiertas. Al entrar con la temporal deberá crear una nueva."
      textoConfirmar="Sí, generar"
      (confirmado)="generar()"
      (cancelado)="preguntando.set(false)"
    />

    @if (clave(); as valor) {
      <dialog
        #dialogoClave
        class="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl bg-white p-6 text-center shadow-2xl backdrop:bg-slate-900/50"
        aria-label="Contraseña temporal generada"
        (cancel)="$event.preventDefault(); clave.set(null)"
      >
        <p class="text-sm font-semibold text-slate-600 wrap-anywhere">
          Contraseña temporal de {{ usuario().nombre_completo }}
        </p>
        <p
          class="mt-3 font-mono text-2xl font-black tracking-widest min-[360px]:text-4xl text-slate-900"
          data-testid="clave-temporal-valor"
        >
          {{ valor }}
        </p>
        <p class="mt-3 text-xs font-medium text-slate-500 wrap-anywhere">
          Díctasela ahora: no se vuelve a mostrar. Usuario: <b>{{ usuario().nombre_usuario }}</b>
        </p>
        <button
          type="button"
          class="mt-5 w-full rounded-2xl bg-marca-700 px-5 py-3 text-base font-semibold text-white hover:bg-marca-800"
          (click)="clave.set(null)"
        >
          Listo, ya la dicté
        </button>
      </dialog>
    }
  `,
})
export class ClaveTemporalComponent {
  readonly usuario = input.required<Usuario>();
  private readonly servicio = inject(UsuariosService);
  protected readonly preguntando = signal(false);
  protected readonly clave = signal<string | null>(null);

  private readonly dialogoClave = viewChild<ElementRef<HTMLDialogElement>>('dialogoClave');

  constructor() {
    effect(() => this.dialogoClave()?.nativeElement.showModal());
  }

  protected generar(): void {
    this.preguntando.set(false);
    this.servicio.passwordTemporal(this.usuario().id).subscribe({
      next: ({ password_temporal }) => this.clave.set(password_temporal),
    });
  }
}
