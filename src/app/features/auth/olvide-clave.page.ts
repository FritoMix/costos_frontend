import type { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';

import { extraerMensaje } from '../../core/interceptores/errores.interceptor';
import { AuthService } from '../../core/servicios/auth.service';
import { BotonComponent } from '../../ui/boton.component';
import { IconoComponent } from '../../ui/icono.component';

type Modo = 'correo' | 'aviso' | 'codigo';

/**
 * «¿Olvidaste tu contraseña?», de tres formas:
 * - Por correo (V29): si la app puede enviar correos, quien verificó su
 *   correo en Mi cuenta recibe un código de 6 dígitos y crea una contraseña
 *   nueva. La respuesta al pedirlo es la misma exista o no el usuario.
 * - Personal de planta: escribe su usuario y se avisa al administrador y al
 *   supervisor para que le den una temporal (V21). La respuesta es la misma
 *   exista o no el usuario.
 * - Administrador: usa uno de sus códigos de recuperación impresos y crea
 *   una contraseña nueva él mismo (V25).
 */
@Component({
  selector: 'app-olvide-clave',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, BotonComponent, IconoComponent],
  template: `
    <main class="flex min-h-dvh items-center justify-center bg-slate-100 px-6 py-10">
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div class="flex items-center gap-3">
          <span class="grid size-12 place-items-center rounded-xl bg-white ring-1 ring-slate-200">
            <img src="/logo.png" alt="Frito Mix" class="size-10 object-contain" />
          </span>
          <span class="text-lg font-extrabold tracking-wide text-marca-950">DATACONTROL</span>
        </div>
        <h1 class="mt-6 text-2xl font-extrabold tracking-tight text-marca-950">
          ¿Olvidaste tu contraseña?
        </h1>

        <div
          class="mt-5 grid gap-1 rounded-xl bg-slate-100 p-1"
          [class.grid-cols-2]="!correoDisponible()"
          [class.grid-cols-3]="correoDisponible()"
          role="tablist"
        >
          @if (correoDisponible()) {
            <button
              type="button"
              role="tab"
              [disabled]="enviando()"
              data-testid="modo-correo"
              [attr.aria-selected]="modo() === 'correo'"
              (click)="cambiarModo('correo')"
              class="min-h-11 rounded-lg px-2 text-sm font-bold leading-tight transition-colors"
              [class]="modo() === 'correo' ? 'bg-white text-marca-950 shadow-sm' : 'text-slate-600 hover:text-marca-950'"
            >
              Por correo
            </button>
          }
          <button
            type="button"
            role="tab"
            [disabled]="enviando()"
            data-testid="modo-aviso"
            [attr.aria-selected]="modo() === 'aviso'"
            (click)="cambiarModo('aviso')"
            class="min-h-11 rounded-lg px-2 text-sm font-bold leading-tight transition-colors"
            [class]="modo() === 'aviso' ? 'bg-white text-marca-950 shadow-sm' : 'text-slate-600 hover:text-marca-950'"
          >
            Personal de planta
          </button>
          <button
            type="button"
            role="tab"
            [disabled]="enviando()"
            data-testid="modo-codigo"
            [attr.aria-selected]="modo() === 'codigo'"
            (click)="cambiarModo('codigo')"
            class="min-h-11 rounded-lg px-2 text-sm font-bold leading-tight transition-colors"
            [class]="modo() === 'codigo' ? 'bg-white text-marca-950 shadow-sm' : 'text-slate-600 hover:text-marca-950'"
          >
            Código impreso
          </button>
        </div>

        @if (mensaje(); as texto) {
          <div
            role="status"
            class="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
          >
            <app-icono nombre="checkCirculo" [tamano]="22" class="mt-0.5 text-emerald-700" />
            <div>
              <p class="font-semibold">{{ texto }}</p>
              @if (modo() === 'aviso') {
                <p class="mt-1 text-sm">Pídele la temporal a tu responsable de planta. Al entrar con ella podrás elegir tu nueva contraseña.</p>
              } @else if (restantes() !== null) {
                <p class="mt-1 text-sm" data-testid="codigos-restantes">
                  Te quedan {{ restantes() }} códigos sin usar.
                  @if (restantes() === 0) {
                    Entra a Mi cuenta y genera códigos nuevos.
                  }
                </p>
              }
            </div>
          </div>
          @if (modo() !== 'aviso') {
            <a
              routerLink="/entrar"
              data-testid="ir-a-entrar"
              class="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-marca-600 font-bold text-white hover:bg-marca-700"
              >Iniciar sesión</a
            >
          }
        } @else if (modo() === 'correo') {
          @if (!codigoEnviado()) {
            <p class="mt-4 text-slate-600">
              Escribe tu usuario. Te enviamos un código de 6 dígitos al correo que verificaste en
              <strong>Mi cuenta</strong>.
            </p>
            <form class="mt-5 space-y-4" (ngSubmit)="pedirPorCorreo()">
              <div>
                <label class="etiqueta" for="usuario-correo">Usuario</label>
                <input
                  id="usuario-correo"
                  name="usuario-correo"
                  class="campo"
                  maxlength="50"
                  autocomplete="username"
                  data-testid="correo-usuario"
                  [ngModel]="usuario()"
                  (ngModelChange)="usuario.set($event)"
                />
              </div>
              <app-boton
                tipo="submit"
                [anchoCompleto]="true"
                [cargando]="enviando()"
                [deshabilitado]="esperandoReenvio()"
                testId="correo-pedir"
              >
                {{ esperandoReenvio() ? 'Espera un minuto para reenviar' : 'Enviar código a mi correo' }}
              </app-boton>
            </form>
          } @else {
            <div
              role="status"
              data-testid="correo-enviado"
              class="mt-5 flex items-start gap-3 rounded-xl border border-marca-200 bg-marca-50 p-4 text-marca-950"
            >
              <app-icono nombre="info" [tamano]="22" class="mt-0.5 text-marca-700" />
              <p class="text-sm font-semibold">{{ avisoCorreo() }}</p>
            </div>
            <form class="mt-5 space-y-4" (ngSubmit)="recuperarPorCorreo()">
              <div>
                <label class="etiqueta" for="codigo-correo">Código del correo</label>
                <input
                  id="codigo-correo"
                  name="codigo-correo"
                  class="campo text-center font-mono text-2xl tracking-[0.5em]"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  placeholder="000000"
                  maxlength="6"
                  data-testid="correo-codigo"
                  [ngModel]="codigo()"
                  (ngModelChange)="codigo.set($event)"
                />
              </div>
              <div>
                <label class="etiqueta" for="clave-correo">Contraseña nueva</label>
                <input
                  id="clave-correo"
                  name="clave-correo"
                  type="password"
                  class="campo"
                  autocomplete="new-password"
                  data-testid="correo-clave"
                  [ngModel]="clave()"
                  (ngModelChange)="clave.set($event)"
                />
                <p class="ayuda">Mínimo 8 caracteres.</p>
              </div>
              <div>
                <label class="etiqueta" for="clave-correo-repetir">Repite la contraseña nueva</label>
                <input
                  id="clave-correo-repetir"
                  name="clave-correo-repetir"
                  type="password"
                  class="campo"
                  autocomplete="new-password"
                  data-testid="correo-clave-repetir"
                  [ngModel]="repetir()"
                  (ngModelChange)="repetir.set($event)"
                />
                @if (repetir() && repetir() !== clave()) {
                  <p class="error-campo" role="alert">Las dos contraseñas no coinciden.</p>
                }
              </div>
              <app-boton
                tipo="submit"
                [anchoCompleto]="true"
                [cargando]="enviando()"
                [deshabilitado]="!puedeRecuperarPorCorreo()"
                testId="correo-enviar"
              >
                Cambiar contraseña
              </app-boton>
              <button
                type="button"
                class="w-full text-center text-sm font-semibold text-marca-700 hover:underline"
                [disabled]="enviando() || esperandoReenvio()"
                data-testid="correo-reenviar"
                (click)="pedirPorCorreo()"
              >
                {{ esperandoReenvio() ? 'Podrás pedir otro código en un minuto' : 'Pedir otro código' }}
              </button>
              <button type="button" class="w-full text-sm font-semibold text-marca-700 hover:underline"
                [disabled]="enviando()" (click)="cambiarUsuarioCorreo()">
                Cambiar de usuario
              </button>
            </form>
          }
        } @else if (modo() === 'aviso') {
          <p class="mt-4 text-slate-600">
            Escribe tu usuario de planta. Tu responsable verá la solicitud en la campana de DATACONTROL
            y te entregará la contraseña temporal personalmente.
          </p>
          <form class="mt-5 space-y-4" (ngSubmit)="pedir()">
            <div>
              <label class="etiqueta" for="usuario">Usuario</label>
              <input
                id="usuario"
                name="usuario"
                class="campo"
                maxlength="50"
                autocomplete="username"
                data-testid="olvide-usuario"
                [ngModel]="usuario()"
                (ngModelChange)="usuario.set($event)"
              />
            </div>
            <app-boton tipo="submit" [anchoCompleto]="true" [cargando]="enviando()"
              testId="olvide-enviar">
              Pedir contraseña temporal
            </app-boton>
          </form>
        } @else {
          <p class="mt-4 text-slate-600">
            Para el administrador: escribe tu usuario, uno de tus códigos de recuperación y tu
            contraseña nueva. Cada código sirve una sola vez. Si perdiste tus códigos, contacta a otro administrador o a quien gestiona el servicio en Render.
          </p>
          <form class="mt-5 space-y-4" (ngSubmit)="recuperar()">
            <div>
              <label class="etiqueta" for="usuario-codigo">Usuario</label>
              <input
                id="usuario-codigo"
                name="usuario-codigo"
                class="campo"
                maxlength="50"
                autocomplete="username"
                data-testid="codigo-usuario"
                [ngModel]="usuario()"
                (ngModelChange)="usuario.set($event)"
              />
            </div>
            <div>
              <label class="etiqueta" for="codigo">Código de recuperación</label>
              <input
                id="codigo"
                name="codigo"
                class="campo font-mono tracking-widest uppercase"
                autocomplete="one-time-code"
                placeholder="ABCD-EFGH-JKLM"
                maxlength="20"
                data-testid="codigo-valor"
                [ngModel]="codigo()"
                (ngModelChange)="codigo.set($event)"
              />
            </div>
            <div>
              <label class="etiqueta" for="clave-nueva">Contraseña nueva</label>
              <input
                id="clave-nueva"
                name="clave-nueva"
                type="password"
                class="campo"
                autocomplete="new-password"
                data-testid="codigo-clave"
                [ngModel]="clave()"
                (ngModelChange)="clave.set($event)"
              />
              <p class="ayuda">Mínimo 8 caracteres.</p>
            </div>
            <div>
              <label class="etiqueta" for="clave-repetir">Repite la contraseña nueva</label>
              <input
                id="clave-repetir"
                name="clave-repetir"
                type="password"
                class="campo"
                autocomplete="new-password"
                data-testid="codigo-clave-repetir"
                [ngModel]="repetir()"
                (ngModelChange)="repetir.set($event)"
              />
              @if (repetir() && repetir() !== clave()) {
                <p class="error-campo" role="alert">Las dos contraseñas no coinciden.</p>
              }
            </div>
            <app-boton
              tipo="submit"
              [anchoCompleto]="true"
              [cargando]="enviando()"
              [deshabilitado]="!puedeRecuperar()"
              testId="codigo-enviar"
            >
              Cambiar contraseña
            </app-boton>
          </form>
        }

        @if (error(); as texto) {
          <p
            role="alert"
            [attr.data-testid]="modo() + '-error'"
            class="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-900"
          >
            <app-icono nombre="alerta" [tamano]="18" class="mt-0.5 text-rose-700" />
            {{ texto }}
          </p>
        }

        <a
          routerLink="/entrar"
          class="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-marca-700 hover:underline"
          >← Volver a iniciar sesión</a
        >
      </div>
    </main>
  `,
})
export class OlvideClavePage {
  private readonly auth = inject(AuthService);
  protected readonly modo = signal<Modo>('aviso');
  /** La app puede enviar códigos por correo (lo configura el administrador). */
  protected readonly correoDisponible = signal(false);
  protected readonly codigoEnviado = signal(false);
  protected readonly avisoCorreo = signal('');
  private readonly ultimoSolicitante = signal<string | null>(null);
  private temporizadorReenvio?: ReturnType<typeof setTimeout>;
  protected readonly esperandoReenvio = computed(() =>
    this.ultimoSolicitante() === this.usuario().trim().toLowerCase()
  );
  protected readonly usuario = signal('');
  protected readonly codigo = signal('');
  protected readonly clave = signal('');
  protected readonly repetir = signal('');
  protected readonly enviando = signal(false);
  protected readonly mensaje = signal<string | null>(null);
  protected readonly restantes = signal<number | null>(null);
  /** Esta pantalla no tiene sesión: los errores se muestran aquí mismo. */
  protected readonly error = signal<string | null>(null);

  protected readonly puedeRecuperar = computed(
    () =>
      this.usuario().trim().length > 0 &&
      this.codigo().replace(/[^0-9a-z]/gi, '').length === 12 &&
      this.clave().length >= 8 &&
      this.clave() === this.repetir(),
  );

  protected readonly puedeRecuperarPorCorreo = computed(
    () =>
      this.usuario().trim().length > 0 &&
      /^\d{6}$/.test(this.codigo().trim()) &&
      this.clave().length >= 8 &&
      this.clave() === this.repetir(),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizadorReenvio));
    // Con un backend anterior o sin envío configurado, la pestaña no aparece.
    this.auth
      .opcionesRecuperacion()
      .pipe(catchError(() => of({ correo: false })))
      .subscribe(({ correo }) => {
        this.correoDisponible.set(correo);
        if (correo && !this.enviando() && this.mensaje() === null && this.usuario() === '') {
          this.modo.set('correo');
        }
      });
  }

  protected cambiarModo(modo: Modo): void {
    if (this.enviando() || this.modo() === modo) return;
    this.modo.set(modo);
    this.clave.set('');
    this.repetir.set('');
    this.codigo.set('');
    this.restantes.set(null);
    this.mensaje.set(null);
    this.error.set(null);
    this.codigoEnviado.set(false);
  }

  protected pedirPorCorreo(): void {
    const nombre = this.usuario().trim();
    if (this.enviando() || this.esperandoReenvio()) return;
    if (!nombre) {
      this.error.set('Escribe tu usuario para recibir el código.');
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    this.auth.pedirCodigoPorCorreo(nombre).subscribe({
      next: ({ mensaje }) => {
        this.enviando.set(false);
        this.avisoCorreo.set(mensaje);
        this.codigoEnviado.set(true);
        clearTimeout(this.temporizadorReenvio);
        this.ultimoSolicitante.set(nombre.toLowerCase());
        this.temporizadorReenvio = setTimeout(() => this.ultimoSolicitante.set(null), 60_000);
      },
      error: (respuesta: HttpErrorResponse) => {
        this.enviando.set(false);
        this.error.set(extraerMensaje(respuesta));
      },
    });
  }

  protected cambiarUsuarioCorreo(): void {
    this.usuario.set('');
    this.clave.set('');
    this.repetir.set('');
    this.codigoEnviado.set(false);
    this.codigo.set('');
    this.error.set(null);
  }

  protected recuperarPorCorreo(): void {
    if (!this.puedeRecuperarPorCorreo() || this.enviando()) return;
    this.enviando.set(true);
    this.error.set(null);
    this.auth.recuperarPorCorreo(this.usuario().trim(), this.codigo().trim(), this.clave()).subscribe({
      next: ({ mensaje }) => {
        this.enviando.set(false);
        this.clave.set('');
        this.repetir.set('');
        this.codigo.set('');
        this.mensaje.set(mensaje);
      },
      error: (respuesta: HttpErrorResponse) => {
        this.enviando.set(false);
        this.error.set(extraerMensaje(respuesta));
      },
    });
  }

  protected pedir(): void {
    const nombre = this.usuario().trim();
    if (this.enviando()) return;
    if (!nombre) {
      this.error.set('Escribe tu usuario de planta para pedir una contraseña temporal.');
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    this.auth.olvidePassword(nombre).subscribe({
      next: ({ mensaje }) => {
        this.enviando.set(false);
        this.mensaje.set(mensaje);
      },
      error: (respuesta: HttpErrorResponse) => {
        this.enviando.set(false);
        this.error.set(extraerMensaje(respuesta));
      },
    });
  }

  protected recuperar(): void {
    if (!this.puedeRecuperar() || this.enviando()) return;
    this.enviando.set(true);
    this.error.set(null);
    this.auth.recuperarConCodigo(this.usuario().trim(), this.codigo().trim(), this.clave()).subscribe({
      next: ({ mensaje, codigos_restantes }) => {
        this.enviando.set(false);
        this.clave.set('');
        this.repetir.set('');
        this.codigo.set('');
        this.restantes.set(codigos_restantes);
        this.mensaje.set(mensaje);
      },
      error: (respuesta: HttpErrorResponse) => {
        this.enviando.set(false);
        this.error.set(extraerMensaje(respuesta));
      },
    });
  }
}
