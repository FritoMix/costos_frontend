import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ETIQUETAS_ROL } from '../../core/modelos/identidad.model';
import { AuthService } from '../../core/servicios/auth.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { BotonComponent } from '../../ui/boton.component';
import { IconoComponent } from '../../ui/icono.component';
import { TarjetaComponent } from '../../ui/tarjeta.component';

/** Datos del usuario conectado y cambio de su propia contrasena. */
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

  ngOnInit(): void {
    if (this.esAdmin()) this.cargarEstado();
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
