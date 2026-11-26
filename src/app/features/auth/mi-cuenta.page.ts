import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { catchError, of } from 'rxjs';

import { ETIQUETAS_ROL } from '../../core/modelos/identidad.model';
import type { EnvioCorreo, EstadoCorreo } from '../../core/modelos/identidad.model';
import { AuthService } from '../../core/servicios/auth.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { BotonComponent } from '../../ui/boton.component';
import { IconoComponent } from '../../ui/icono.component';
import { TarjetaComponent } from '../../ui/tarjeta.component';

/** Datos del usuario conectado, su contraseña y su correo de recuperación. */
@Component({
  selector: 'app-mi-cuenta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TarjetaComponent, BotonComponent, IconoComponent],
  template: `
    <div class="pagina-contenido mx-auto max-w-2xl">
      <header>
        <h1 class="titulo-pagina">Mi cuenta</h1>
        <p class="subtitulo-pagina">
          Perfil de operario o supervisor conectado en la terminal de planta.
        </p>
      </header>

      <app-tarjeta titulo="Identidad del Operador">
        <div class="flex flex-wrap items-center gap-4 pb-4 mb-4 border-b border-slate-100">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-marca-700 text-white font-mono text-xl font-black shadow-sm">
            {{ iniciales(auth.usuario()?.nombre_completo ?? '') }}
          </div>
          <div>
            <h2 class="text-lg font-black text-slate-900">{{ auth.usuario()?.nombre_completo }}</h2>
            <div class="flex flex-wrap items-center gap-2 mt-1">
              <span class="inline-flex items-center gap-1 rounded-md bg-marca-50 px-2 py-0.5 text-xs font-bold text-marca-800 border border-marca-200/60">
                {{ etiquetaRol() }}
              </span>
              <span class="font-mono text-xs text-slate-500 font-semibold">@{{ auth.usuario()?.nombre_usuario }}</span>
            </div>
          </div>
        </div>

        <dl class="grid gap-4 sm:grid-cols-2 text-sm">
          <div class="rounded-xl bg-slate-50 p-3.5 border border-slate-200/60">
            <dt class="text-xs font-bold uppercase tracking-wider text-slate-400">Organización</dt>
            <dd class="mt-1 font-bold text-slate-800">Fritomix S.A.S.</dd>
          </div>
          <div class="rounded-xl bg-slate-50 p-3.5 border border-slate-200/60">
            <dt class="text-xs font-bold uppercase tracking-wider text-slate-400">Estado de Cuenta</dt>
            <dd class="mt-1 font-bold text-emerald-700 flex items-center gap-1.5">
              <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
              Sesión Activa
            </dd>
          </div>
        </dl>
      </app-tarjeta>

      <app-tarjeta
        titulo="Cambiar Contraseña de Acceso"
        subtitulo="Mínimo 8 caracteres. Asegura una clave fácil de recordar pero segura."
      >
        <form [formGroup]="formulario" (ngSubmit)="guardar()" class="space-y-4">
          <div>
            <label class="etiqueta" for="actual">Contraseña Actual</label>
            <input
              id="actual"
              type="password"
              class="campo"
              placeholder="Ingresa tu clave actual"
              formControlName="password_actual"
              autocomplete="current-password"
            />
          </div>
          <div>
            <label class="etiqueta" for="nueva">Nueva Contraseña</label>
            <input
              id="nueva"
              type="password"
              class="campo"
              placeholder="Mínimo 8 caracteres"
              formControlName="password_nueva"
              autocomplete="new-password"
              [class.campo-invalido]="invalidoNueva()"
            />
            @if (invalidoNueva()) {
              <p class="error-campo">La contraseña nueva debe tener al menos 8 caracteres.</p>
            }
          </div>
          <div class="acciones-formulario">
            <app-boton tipo="submit" variante="primario" [cargando]="enviando()">
              Actualizar Contraseña
            </app-boton>
          </div>
        </form>
      </app-tarjeta>

      @if (correo(); as c) {
        <app-tarjeta
          titulo="Correo de recuperación"
          subtitulo="Si olvidas tu contraseña, te enviamos un código a este correo para crear una nueva."
        >
          <div class="space-y-4" data-testid="seccion-correo">
            @if (c.verificado && !editandoCorreo()) {
              <div
                class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                data-testid="correo-estado"
              >
                <div class="flex items-center gap-3">
                  <app-icono nombre="checkCirculo" [tamano]="22" class="text-emerald-700" />
                  <div>
                    <p class="font-bold text-slate-900">{{ c.correo }}</p>
                    <p class="text-sm font-semibold text-emerald-800">Verificado</p>
                  </div>
                </div>
                <app-boton variante="secundario" (click)="editarCorreo()" testId="correo-cambiar">
                  Cambiar correo
                </app-boton>
              </div>
            } @else if (c.pendiente && !editandoCorreo()) {
              <p class="text-slate-700">
                Enviamos un código de 6 dígitos a <strong>{{ c.pendiente }}</strong>. Escríbelo para
                verificar tu correo; vence en 15 minutos. Revisa también la carpeta de spam.
              </p>
              <form [formGroup]="formVerificar" (ngSubmit)="verificarCorreo()" class="space-y-4">
                <div>
                  <label class="etiqueta" for="codigo-verificar">Código</label>
                  <input
                    id="codigo-verificar"
                    class="campo max-w-56 text-center font-mono text-2xl tracking-[0.4em]"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    maxlength="6"
                    placeholder="000000"
                    formControlName="codigo"
                    data-testid="correo-codigo-verificar"
                  />
                </div>
                <div class="flex flex-wrap gap-3">
                  <app-boton tipo="submit" [cargando]="procesandoCorreo()" testId="correo-verificar">
                    Verificar correo
                  </app-boton>
                  <app-boton variante="texto" (click)="editarCorreo()">
                    Usar otro correo o reenviar
                  </app-boton>
                </div>
              </form>
            } @else if (!c.envio_configurado) {
              <p
                class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950"
                data-testid="correo-sin-envio"
              >
                <app-icono nombre="alerta" [tamano]="18" class="mt-0.5 text-amber-700" />
                @if (esAdmin()) {
                  Primero activa el envío de correos en la tarjeta «Envío de correos desde Gmail».
                } @else {
                  El administrador aún no ha activado el envío de correos.
                }
              </p>
            } @else {
              <form [formGroup]="formCorreo" (ngSubmit)="registrarCorreo()" class="space-y-4">
                <div>
                  <label class="etiqueta" for="correo-direccion">Tu correo</label>
                  <input
                    id="correo-direccion"
                    type="email"
                    class="campo"
                    autocomplete="email"
                    placeholder="nombre@gmail.com"
                    formControlName="correo"
                    data-testid="correo-direccion"
                  />
                </div>
                <div>
                  <label class="etiqueta" for="correo-clave">Tu contraseña actual</label>
                  <input
                    id="correo-clave"
                    type="password"
                    class="campo"
                    autocomplete="current-password"
                    formControlName="password_actual"
                    data-testid="correo-clave-actual"
                  />
                  <p class="ayuda">Te enviamos un código para confirmar que el correo es tuyo.</p>
                </div>
                <div class="flex flex-wrap gap-3">
                  <app-boton tipo="submit" [cargando]="procesandoCorreo()" testId="correo-enviar-codigo">
                    Enviar código
                  </app-boton>
                  @if (editandoCorreo()) {
                    <app-boton variante="texto" (click)="editandoCorreo.set(false)">Cancelar</app-boton>
                  }
                  @if (c.verificado) {
                    <app-boton variante="texto" (click)="quitarCorreo()" testId="correo-quitar">
                      Quitar mi correo
                    </app-boton>
                  }
                </div>
              </form>
            }
          </div>
        </app-tarjeta>
      }

      @if (esAdmin() && envio(); as e) {
        <app-tarjeta
          titulo="Envío de correos desde Gmail"
          subtitulo="Los códigos de recuperación salen de tu cuenta de Gmail, gratis, con un script de Google."
        >
          <div class="space-y-5" data-testid="seccion-envio">
            <p
              class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold"
              [class]="e.configurado ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200'"
              data-testid="envio-estado"
            >
              <span class="h-2 w-2 rounded-full" [class]="e.configurado ? 'bg-emerald-500' : 'bg-amber-500'"></span>
              {{ e.configurado ? 'Envío activo' : 'Envío sin activar' }}
            </p>

            <ol class="list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>
                Con tu Gmail abierto, entra a
                <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener"
                  class="font-bold text-marca-700 underline">script.google.com</a>
                (se crea un proyecto nuevo). Borra lo que trae y pega el script de abajo. Guarda.
              </li>
              <li>
                <strong>Implementar → Nueva implementación</strong> → tipo <strong>Aplicación web</strong>.
                Ejecutar como: <strong>Yo</strong>. Quién tiene acceso: <strong>Cualquier usuario</strong>.
              </li>
              <li>Autoriza el permiso para enviar correos y copia la <strong>URL de la aplicación web</strong>.</li>
              <li>Pégala aquí, guarda y envía una prueba.</li>
            </ol>

            <div>
              <div class="mb-1.5 flex items-center justify-between">
                <span class="etiqueta mb-0">Script para Google</span>
                <app-boton variante="secundario" (click)="copiarScript(e.script)" testId="envio-copiar">
                  Copiar script
                </app-boton>
              </div>
              <textarea
                readonly
                rows="6"
                class="campo font-mono text-xs"
                data-testid="envio-script"
                [value]="e.script"
              ></textarea>
              <p class="ayuda">Tiene un secreto: no lo compartas ni lo publiques.</p>
            </div>

            <form [formGroup]="formEnvio" (ngSubmit)="guardarEnvio()" class="space-y-3">
              <label class="etiqueta" for="envio-url">URL de la aplicación web</label>
              <input
                id="envio-url"
                class="campo font-mono text-sm"
                placeholder="https://script.google.com/macros/s/…/exec"
                formControlName="url_envio"
                data-testid="envio-url"
              />
              <app-boton tipo="submit" [cargando]="procesandoEnvio()" testId="envio-guardar">
                Guardar URL
              </app-boton>
            </form>

            @if (e.configurado) {
              <form [formGroup]="formPrueba" (ngSubmit)="probarEnvio()" class="space-y-3 border-t border-slate-100 pt-5">
                <label class="etiqueta" for="envio-prueba-para">Enviar un correo de prueba a</label>
                <input
                  id="envio-prueba-para"
                  type="email"
                  class="campo"
                  placeholder="nombre@gmail.com"
                  formControlName="para"
                  data-testid="envio-prueba-para"
                />
                <app-boton tipo="submit" variante="secundario" [cargando]="procesandoEnvio()" testId="envio-prueba">
                  Enviar prueba
                </app-boton>
              </form>
            }

            <p class="text-xs text-slate-500">
              ¿Crees que alguien vio el script?
              <button type="button" class="font-bold text-marca-700 underline" (click)="regenerarSecreto()">
                Cambiar el secreto
              </button>
              y vuelve a pegar el script en Google (nueva implementación).
            </p>
          </div>
        </app-tarjeta>
      }

      @if (esAdmin()) {
        <app-tarjeta
          titulo="Códigos de recuperación"
          subtitulo="Si olvidas tu contraseña, entras con uno de estos códigos sin depender de nadie."
        >
          <div class="space-y-5" data-testid="seccion-codigos">
            @if (codigos(); as lista) {
              <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <p class="flex items-center gap-2 font-bold">
                  <app-icono nombre="alerta" [tamano]="20" class="text-amber-700" />
                  Guárdalos ahora: no se vuelven a mostrar.
                </p>
                <p class="mt-1 text-sm">
                  Imprímelos o anótalos y guárdalos en un lugar seguro. Cada uno sirve una sola vez.
                </p>
              </div>
              <ol class="grid grid-cols-2 gap-2" data-testid="lista-codigos">
                @for (codigo of lista; track codigo) {
                  <li
                    class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-center font-mono text-base font-bold tracking-wider text-marca-950"
                  >
                    {{ codigo }}
                  </li>
                }
              </ol>
              <div class="flex flex-wrap gap-3">
                <app-boton variante="secundario" (click)="copiar()">Copiar</app-boton>
                <app-boton variante="secundario" (click)="imprimir()">Imprimir</app-boton>
                <app-boton variante="texto" (click)="codigos.set(null)" testId="codigos-listo">Ya los guardé</app-boton>
              </div>
            } @else {
              <p class="text-slate-700" data-testid="estado-codigos">
                @if (estado(); as e) {
                  @if (e.generados_en) {
                    Te quedan <strong>{{ e.disponibles }}</strong> de 8 códigos sin usar.
                  } @else {
                    Todavía no tienes códigos. Genéralos y guárdalos impresos.
                  }
                }
              </p>
              <form [formGroup]="formCodigos" (ngSubmit)="generar()" class="space-y-4">
                <div>
                  <label class="etiqueta" for="clave-codigos">Tu contraseña actual</label>
                  <input
                    id="clave-codigos"
                    type="password"
                    class="campo"
                    autocomplete="current-password"
                    formControlName="password_actual"
                    data-testid="codigos-clave"
                  />
                  <p class="ayuda">Generar códigos nuevos anula los anteriores.</p>
                </div>
                <app-boton tipo="submit" [cargando]="generando()" testId="codigos-generar">
                  Generar códigos
                </app-boton>
              </form>
            }
          </div>
        </app-tarjeta>
      }
    </div>
  `,
})
export class MiCuentaPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly avisos = inject(NotificacionesService);
  protected readonly auth = inject(AuthService);

  protected readonly enviando = signal(false);

  // --- Códigos de recuperación (solo administrador, V25) ---
  protected readonly esAdmin = computed(() => this.auth.rol() === 'admin');
  protected readonly estado = signal<{ disponibles: number; generados_en: string | null } | null>(null);
  protected readonly codigos = signal<string[] | null>(null);
  protected readonly generando = signal(false);
  protected readonly formCodigos = this.fb.nonNullable.group({
    password_actual: ['', Validators.required],
  });

  // --- Correo de recuperación (V29) ---
  protected readonly correo = signal<EstadoCorreo | null>(null);
  protected readonly editandoCorreo = signal(false);
  protected readonly procesandoCorreo = signal(false);
  protected readonly formCorreo = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    password_actual: ['', Validators.required],
  });
  protected readonly formVerificar = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  // --- Envío de correos (solo administrador, V29) ---
  protected readonly envio = signal<EnvioCorreo | null>(null);
  protected readonly procesandoEnvio = signal(false);
  protected readonly formEnvio = this.fb.nonNullable.group({ url_envio: [''] });
  protected readonly formPrueba = this.fb.nonNullable.group({
    para: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    if (this.esAdmin()) {
      this.cargarEstado();
      this.cargarEnvio();
    }
    this.cargarCorreo();
  }

  private cargarCorreo(): void {
    // Con un backend anterior la tarjeta no aparece.
    this.auth
      .estadoCorreo()
      .pipe(catchError(() => of(null)))
      .subscribe((estado) => this.correo.set(estado));
  }

  private cargarEnvio(): void {
    this.auth
      .envioCorreo()
      .pipe(catchError(() => of(null)))
      .subscribe((envio) => this.ponerEnvio(envio));
  }

  private ponerEnvio(envio: EnvioCorreo | null): void {
    this.envio.set(envio);
    if (envio) this.formEnvio.setValue({ url_envio: envio.url_envio ?? '' });
  }

  protected editarCorreo(): void {
    this.formCorreo.reset({ correo: this.correo()?.pendiente ?? this.correo()?.correo ?? '' });
    this.editandoCorreo.set(true);
  }

  protected registrarCorreo(): void {
    if (this.formCorreo.invalid || this.procesandoCorreo()) {
      this.formCorreo.markAllAsTouched();
      if (this.formCorreo.controls.correo.invalid) this.avisos.error('Escribe un correo válido.');
      return;
    }
    const { correo, password_actual } = this.formCorreo.getRawValue();
    this.procesandoCorreo.set(true);
    this.auth.registrarCorreo(correo.trim(), password_actual).subscribe({
      next: (estado) => {
        this.procesandoCorreo.set(false);
        this.formCorreo.reset();
        this.formVerificar.reset();
        this.editandoCorreo.set(false);
        this.correo.set(estado);
        this.avisos.exito('Te enviamos un código. Revisa tu correo.');
      },
      error: () => this.procesandoCorreo.set(false),
    });
  }

  protected verificarCorreo(): void {
    if (this.formVerificar.invalid || this.procesandoCorreo()) {
      this.avisos.error('Escribe los 6 dígitos del código.');
      return;
    }
    this.procesandoCorreo.set(true);
    this.auth.verificarCorreo(this.formVerificar.getRawValue().codigo).subscribe({
      next: (estado) => {
        this.procesandoCorreo.set(false);
        this.formVerificar.reset();
        this.correo.set(estado);
        this.avisos.exito('Correo verificado. Ya puedes recuperar tu contraseña por correo.');
      },
      error: () => this.procesandoCorreo.set(false),
    });
  }

  protected quitarCorreo(): void {
    const clave = this.formCorreo.controls.password_actual.value;
    if (!clave) {
      this.avisos.error('Escribe tu contraseña actual para quitar el correo.');
      return;
    }
    this.procesandoCorreo.set(true);
    this.auth.quitarCorreo(clave).subscribe({
      next: (estado) => {
        this.procesandoCorreo.set(false);
        this.formCorreo.reset();
        this.editandoCorreo.set(false);
        this.correo.set(estado);
        this.avisos.exito('Quitaste tu correo de recuperación.');
      },
      error: () => this.procesandoCorreo.set(false),
    });
  }

  protected copiarScript(script: string): void {
    void navigator.clipboard?.writeText(script).then(() => this.avisos.exito('Script copiado.'));
  }

  protected guardarEnvio(): void {
    if (this.procesandoEnvio()) return;
    const url = this.formEnvio.getRawValue().url_envio.trim();
    this.procesandoEnvio.set(true);
    this.auth.guardarEnvioCorreo(url || null).subscribe({
      next: (envio) => {
        this.procesandoEnvio.set(false);
        this.ponerEnvio(envio);
        this.cargarCorreo();
        this.avisos.exito(envio.configurado ? 'Envío activado. Envía una prueba.' : 'Envío desactivado.');
      },
      error: () => this.procesandoEnvio.set(false),
    });
  }

  protected probarEnvio(): void {
    if (this.formPrueba.invalid || this.procesandoEnvio()) {
      this.avisos.error('Escribe un correo válido para la prueba.');
      return;
    }
    this.procesandoEnvio.set(true);
    this.auth.probarEnvioCorreo(this.formPrueba.getRawValue().para.trim()).subscribe({
      next: ({ mensaje }) => {
        this.procesandoEnvio.set(false);
        this.avisos.exito(mensaje);
      },
      error: () => this.procesandoEnvio.set(false),
    });
  }

  protected regenerarSecreto(): void {
    if (this.procesandoEnvio()) return;
    this.procesandoEnvio.set(true);
    this.auth.regenerarSecretoCorreo().subscribe({
      next: (envio) => {
        this.procesandoEnvio.set(false);
        this.ponerEnvio(envio);
        this.avisos.exito('Secreto cambiado. Copia el script y vuelve a implementarlo en Google.');
      },
      error: () => this.procesandoEnvio.set(false),
    });
  }

  private cargarEstado(): void {
    this.auth.estadoCodigos().subscribe((estado) => this.estado.set(estado));
  }

  protected generar(): void {
    if (this.formCodigos.invalid || this.generando()) {
      this.formCodigos.markAllAsTouched();
      return;
    }
    this.generando.set(true);
    this.auth.generarCodigos(this.formCodigos.getRawValue().password_actual).subscribe({
      next: ({ codigos }) => {
        this.generando.set(false);
        this.formCodigos.reset();
        this.codigos.set(codigos);
        this.cargarEstado();
      },
      error: () => this.generando.set(false),
    });
  }

  protected copiar(): void {
    const texto = (this.codigos() ?? []).join('\n');
    void navigator.clipboard?.writeText(texto).then(() => this.avisos.exito('Códigos copiados.'));
  }

  protected imprimir(): void {
    window.print();
  }

  protected readonly formulario = this.fb.nonNullable.group({
    password_actual: ['', Validators.required],
    password_nueva: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected etiquetaRol(): string {
    const rol = this.auth.rol();
    return rol ? ETIQUETAS_ROL[rol] : '';
  }

  protected iniciales(nombre: string): string {
    if (!nombre) return 'OP';
    return nombre
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  protected invalidoNueva(): boolean {
    const control = this.formulario.controls.password_nueva;
    return control.invalid && control.touched;
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { password_actual, password_nueva } = this.formulario.getRawValue();
    this.enviando.set(true);
    this.auth.cambiarPassword(password_actual, password_nueva).subscribe({
      next: () => {
        this.enviando.set(false);
        this.formulario.reset();
        this.avisos.exito('Tu contraseña quedó cambiada.');
      },
      error: () => this.enviando.set(false),
    });
  }
}
