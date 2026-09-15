import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AlarmaService } from '../../core/servicios/alarma.service';
import { AuthService } from '../../core/servicios/auth.service';
import { BotonComponent } from '../../ui/boton.component';

/**
 * Pantalla de autenticación futurista con gradientes vibrantes y acabados espectaculares.
 */
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BotonComponent],
  template: `
    <!-- Medium Blue Background (Azul Zafiro Intermedio) -->
    <div class="relative flex min-h-screen items-center justify-center px-4 py-12 text-white selection:bg-cyan-400 selection:text-slate-950"
         style="background: linear-gradient(135deg, #083344 0%, #075985 35%, #0284c7 70%, #1e40af 100%);">

      <!-- Technical Grid Overlay -->
      <div class="pointer-events-none absolute inset-0 opacity-[0.07]"
           style="background-image: linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px);
                  background-size: 36px 36px;"></div>

      <!-- Main Login Content Container -->
      <div class="relative z-10 w-full max-w-md anim-escala">

        <!-- Logo & Brand Header -->
        <div class="mb-8 text-center anim-entrada flex flex-col items-center">
          
          <!-- Large Hero Logo Container -->
          <div class="relative group cursor-pointer p-3 mb-2 flex items-center justify-center">
            <!-- Soft ambient glow -->
            <div class="absolute inset-0 rounded-full bg-cyan-300/25 blur-3xl transition-all duration-500 group-hover:bg-cyan-300/40"></div>

            <!-- Logo PNG Transparente - Formato Grande Prominente -->
            <img src="/logo.png" alt="Pasabocas Frito Mix" class="relative z-10 h-36 sm:h-44 w-auto object-contain drop-shadow-[0_16px_30px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:scale-105" />
          </div>

          <!-- Título con Texto Blanco Nítido -->
          <h1 class="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
            {{ appNombre }}
          </h1>

          <!-- Insignia de Planta -->
          <div class="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-slate-950/40 px-4 py-1.5 backdrop-blur-md shadow-md">
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
            </span>
            <span class="text-[11px] font-extrabold uppercase tracking-widest text-cyan-200">
              Pasabocas Frito Mix · Control de Planta
            </span>
          </div>
        </div>

        <!-- Form Card Glassmorphism en Azul Intermedio -->
        <div class="relative rounded-3xl bg-slate-950/55 border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl p-8 sm:p-10 overflow-hidden">
          
          <!-- Top Accent Bright Line -->
          <div class="absolute top-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300"></div>

          <div class="mb-6 flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-extrabold text-white tracking-tight">
                Iniciar Sesión
              </h2>
              <p class="text-xs text-sky-100/90 font-medium mt-1">
                Ingresa con tus credenciales autorizadas de planta
              </p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/20 border border-cyan-300/30 text-cyan-200 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 4.12a13.92 13.92 0 01-2.923 2.502" />
              </svg>
            </div>
          </div>

          <form [formGroup]="formulario" (ngSubmit)="entrar()" class="space-y-5 escalona">
            <!-- Campo Usuario -->
            <div>
              <label class="etiqueta !text-cyan-100 text-xs font-bold uppercase tracking-wider" for="usuario">Usuario de Planta</label>
              <div class="relative group mt-1.5">
                <div class="relative flex items-center bg-slate-950/60 rounded-2xl border border-cyan-300/30 group-focus-within:border-cyan-300 group-focus-within:bg-slate-950/80 group-focus-within:ring-4 group-focus-within:ring-cyan-300/20 transition-all">
                  <!-- Inner Icon Badge -->
                  <div class="absolute left-3 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-300/30 text-cyan-200 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    id="usuario"
                    type="text"
                    class="w-full !bg-transparent !pl-15 !pr-4 !py-3.5 !rounded-2xl !text-white placeholder:!text-sky-200/40 focus:!outline-none font-semibold text-sm"
                    placeholder="Ej. operador01"
                    formControlName="nombre_usuario"
                    autocomplete="username"
                    autocapitalize="none"
                    spellcheck="false"
                    [class.campo-invalido]="invalido('nombre_usuario')"
                    [class.anim-shake]="invalido('nombre_usuario')"
                  />
                </div>
              </div>
              @if (invalido('nombre_usuario')) {
                <p class="error-campo !text-rose-300 text-xs mt-1.5 flex items-center gap-1.5 font-semibold anim-bajar">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Escribe tu nombre de usuario.
                </p>
              }
            </div>

            <!-- Campo Contraseña -->
            <div>
              <label class="etiqueta !text-cyan-100 text-xs font-bold uppercase tracking-wider" for="password">Contraseña</label>
              <div class="relative group mt-1.5">
                <div class="relative flex items-center bg-slate-950/60 rounded-2xl border border-cyan-300/30 group-focus-within:border-cyan-300 group-focus-within:bg-slate-950/80 group-focus-within:ring-4 group-focus-within:ring-cyan-300/20 transition-all">
                  <!-- Inner Icon Badge -->
                  <div class="absolute left-3 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-300/30 text-cyan-200 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    [type]="mostrarPassword() ? 'text' : 'password'"
                    class="w-full !bg-transparent !pl-15 !pr-13 !py-3.5 !rounded-2xl !text-white placeholder:!text-sky-200/40 focus:!outline-none font-semibold text-sm"
                    placeholder="••••••••"
                    formControlName="password"
                    autocomplete="current-password"
                    [class.campo-invalido]="invalido('password')"
                    [class.anim-shake]="invalido('password')"
                  />
                  <!-- Botón Mostrar/Ocultar Contraseña -->
                  <button
                    type="button"
                    (click)="toggleMostrarPassword()"
                    class="absolute right-3 flex items-center group/btn focus:outline-none"
                    [title]="mostrarPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  >
                    <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 group-hover/btn:bg-cyan-400/30 text-cyan-200 group-hover/btn:text-white transition-all border border-white/20">
                      @if (mostrarPassword()) {
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
                        </svg>
                      } @else {
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      }
                    </div>
                  </button>
                </div>
              </div>
              @if (invalido('password')) {
                <p class="error-campo !text-rose-300 text-xs mt-1.5 flex items-center gap-1.5 font-semibold anim-bajar">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Escribe tu contraseña.
                </p>
              }
            </div>

            <!-- Botón Submit -->
            <div class="pt-3">
              <app-boton tipo="submit" tamano="grande" [anchoCompleto]="true" [cargando]="enviando()">
                Ingresar al Sistema
              </app-boton>
            </div>
          </form>
        </div>

        <!-- Status System Bar -->
        <div class="mt-6 text-center text-[11px] text-cyan-100/90 font-medium flex items-center justify-center gap-3 bg-slate-950/40 rounded-full py-2.5 px-6 border border-cyan-300/30 shadow-md backdrop-blur-md">
          <span class="inline-flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Servidor en Línea
          </span>
          <span class="text-cyan-300/40">•</span>
          <span class="inline-flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full bg-cyan-300"></span>
            Conexión Cifrada
          </span>
          <span class="text-cyan-300/40">•</span>
          <span class="rounded-md bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-cyan-200 border border-cyan-300/30">
            v2.0
          </span>
        </div>

      </div>
    </div>
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alarma = inject(AlarmaService);

  protected readonly appNombre = environment.appNombre;
  protected readonly empresa = environment.empresa;
  protected readonly enviando = signal(false);
  protected readonly mostrarPassword = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    nombre_usuario: ['', Validators.required],
    password: ['', Validators.required],
  });

  protected invalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!control && control.invalid && control.touched;
  }

  protected toggleMostrarPassword(): void {
    this.mostrarPassword.update((v) => !v);
  }

  protected entrar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.alarma.prepararTrasInteraccion();

    this.enviando.set(true);
    this.auth.iniciarSesion(this.formulario.getRawValue()).subscribe({
      next: () => {
        this.enviando.set(false);
        void this.router.navigateByUrl(this.auth.rutaInicial());
      },
      error: () => this.enviando.set(false),
    });
  }
}

