import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/servicios/auth.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { BotonComponent } from '../../ui/boton.component';

/**
 * Entró con una contraseña temporal: antes de seguir debe crear la suya.
 * La app no deja abrir otra pantalla hasta que lo haga.
 */
@Component({
  selector: 'app-crear-clave',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, BotonComponent],
  template: `
    <main class="flex min-h-dvh items-center justify-center bg-marca-50 px-3 py-5 sm:px-6 sm:py-10">
      <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-8">
        <img src="/logo.png" alt="FritoMix" class="h-12 w-16 object-contain" />
        <h1 class="mt-4 text-2xl font-extrabold tracking-tight text-marca-950">
          Crea tu contraseña
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          Entraste con una contraseña temporal. Crea la tuya para seguir; mínimo 8 caracteres.
        </p>
        <form class="mt-7 grid gap-5" (ngSubmit)="guardar()">
          <div>
            <label class="etiqueta" for="temporal">Contraseña temporal</label>
            <input
              id="temporal"
              name="temporal"
              type="password"
              class="campo"
              autocomplete="current-password"
              [ngModel]="temporal()"
              (ngModelChange)="temporal.set($event)"
            />
          </div>
          <div>
            <label class="etiqueta" for="nueva">Contraseña nueva</label>
            <input
              id="nueva"
              name="nueva"
              type="password"
              class="campo"
              autocomplete="new-password"
              [ngModel]="nueva()"
              (ngModelChange)="nueva.set($event)"
            />
          </div>
          <div>
            <label class="etiqueta" for="repetir">Repite la contraseña nueva</label>
            <input
              id="repetir"
              name="repetir"
              type="password"
              class="campo"
              autocomplete="new-password"
              [ngModel]="repetir()"
              (ngModelChange)="repetir.set($event)"
            />
          </div>
          <app-boton tipo="submit" [anchoCompleto]="true" [cargando]="enviando()"
            >Guardar y entrar</app-boton
          >
        </form>
        <button
          type="button"
          class="mt-6 text-sm font-semibold text-slate-500 hover:underline"
          (click)="salir()"
        >
          Salir
        </button>
      </div>
    </main>
  `,
})
export class CrearClavePage {
  private readonly auth = inject(AuthService);
  private readonly avisos = inject(NotificacionesService);
  private readonly router = inject(Router);
  protected readonly temporal = signal('');
  protected readonly nueva = signal('');
  protected readonly repetir = signal('');
  protected readonly enviando = signal(false);

  protected guardar(): void {
    if (this.enviando()) return;
    if (this.nueva().length < 8) {
      this.avisos.error('La contraseña nueva debe tener al menos 8 caracteres.');
      return;
    }
    if (this.nueva() !== this.repetir()) {
      this.avisos.error('Las dos contraseñas nuevas no coinciden.');
      return;
    }
    this.enviando.set(true);
    this.auth.cambiarPassword(this.temporal(), this.nueva()).subscribe({
      next: () => {
        this.enviando.set(false);
        this.avisos.exito('Listo: ya tienes tu contraseña.');
        void this.router.navigateByUrl(this.auth.rutaInicial());
      },
      error: () => this.enviando.set(false),
    });
  }

  protected salir(): void {
    this.auth.cerrarSesion();
  }
}
