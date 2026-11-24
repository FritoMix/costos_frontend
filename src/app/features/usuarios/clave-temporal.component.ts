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
        class="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto whitespace-normal rounded-2xl bg-white p-5 text-left sm:p-7 shadow-2xl backdrop:bg-slate-900/50"
        aria-label="Contraseña temporal generada"
        (cancel)="$event.preventDefault(); clave.set(null)"
      >
        <h2 class="text-xl font-bold text-slate-900">Contraseña temporal</h2>
        <div class="mt-4 wrap-anywhere">
          <p class="font-semibold text-slate-800">{{ usuario().nombre_completo }}</p>
          <p class="mt-1 text-sm text-slate-600">Usuario: {{ usuario().nombre_usuario }}</p>
        </div>
        <p
          class="my-5 rounded-xl border border-marca-200 bg-marca-50 px-2 py-4 text-center font-mono text-2xl font-bold tracking-widest text-marca-950 min-[360px]:text-3xl"
          data-testid="clave-temporal-valor"
        >
          {{ valor }}
        </p>
        <p class="text-sm leading-relaxed text-slate-600">
          Díctale estos ocho números antes de cerrar esta ventana. La contraseña se muestra una sola vez.
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
