import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/servicios/auth.service';
import { BotonComponent } from '../../ui/boton.component';

/**
 * «¿Olvidaste tu contraseña?» sin correo: la persona escribe su usuario y le
 * llega un aviso al administrador y al supervisor, que le dan una temporal.
 * La respuesta es la misma exista o no el usuario.
 */
@Component({
  selector: 'app-olvide-clave',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, BotonComponent],
  template: `
    <main class="flex min-h-dvh items-center justify-center bg-marca-50 px-6 py-10">
      <div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <img src="/logo.png" alt="FritoMix" class="h-12 w-16 object-contain" />
        <h1 class="mt-4 text-2xl font-extrabold tracking-tight text-marca-950">
          ¿Olvidaste tu contraseña?
        </h1>
        @if (mensaje(); as texto) {
          <p
            role="status"
            class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {{ texto }}
          </p>
          <p class="mt-3 text-sm text-slate-600">
            Cuando te la den, entra con ella y la app te pedirá crear una nueva.
          </p>
        } @else {
          <p class="mt-2 text-sm text-slate-600">
            Escribe tu usuario. Le avisaremos al administrador y al supervisor para que te den una
            contraseña temporal.
          </p>
          <form class="mt-6 space-y-4" (ngSubmit)="pedir()">
            <div>
              <label class="etiqueta" for="usuario">Usuario</label>
              <input
                id="usuario"
                name="usuario"
                class="campo"
                autocomplete="username"
                data-testid="olvide-usuario"
                [ngModel]="usuario()"
                (ngModelChange)="usuario.set($event)"
              />
            </div>
            <app-boton
              tipo="submit"
              [anchoCompleto]="true"
              [cargando]="enviando()"
              testId="olvide-enviar"
            >
              Pedir contraseña temporal
            </app-boton>
          </form>
        }
        <a
          routerLink="/entrar"
          class="mt-6 inline-block text-sm font-semibold text-marca-700 hover:underline"
          >← Volver a iniciar sesión</a
        >
      </div>
    </main>
  `,
})
export class OlvideClavePage {
  private readonly auth = inject(AuthService);
  protected readonly usuario = signal('');
  protected readonly enviando = signal(false);
  protected readonly mensaje = signal<string | null>(null);

  protected pedir(): void {
    const nombre = this.usuario().trim();
    if (!nombre || this.enviando()) return;
    this.enviando.set(true);
    this.auth.olvidePassword(nombre).subscribe({
      next: ({ mensaje }) => {
        this.enviando.set(false);
        this.mensaje.set(mensaje);
      },
      error: () => this.enviando.set(false),
    });
  }
}
