import type { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AlarmaService } from '../../core/servicios/alarma.service';
import { AuthService } from '../../core/servicios/auth.service';
import { BotonComponent } from '../../ui/boton.component';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BotonComponent],
  templateUrl: './login.page.html',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly alarma = inject(AlarmaService);

  protected readonly appNombre = environment.appNombre;
  protected readonly modulos = ['Órdenes', 'Horno', 'Saborizado', 'Análisis'];
  protected readonly enviando = signal(false);
  protected readonly errorEntrada = signal<string | null>(null);
  protected readonly mostrarPassword = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    nombre_usuario: ['', [Validators.required, Validators.maxLength(50)]],
    password: ['', [Validators.required, Validators.maxLength(1024)]],
  });

  protected invalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!control && control.invalid && control.touched;
  }

  protected toggleMostrarPassword(): void {
    this.mostrarPassword.update((v) => !v);
  }

  protected entrar(): void {
    if (this.enviando()) return;
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.alarma.prepararTrasInteraccion();

    this.errorEntrada.set(null);
    this.enviando.set(true);
    this.auth.iniciarSesion(this.formulario.getRawValue()).subscribe({
      next: () => {
        this.enviando.set(false);
        void this.router.navigateByUrl(this.destinoTrasEntrar());
      },
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        this.errorEntrada.set(error.status === 429
          ? 'Demasiados intentos de acceso desde esta red. Espera un momento y vuelve a intentarlo.'
          : error.status === 401
            ? 'Revisa el usuario y la contraseña e inténtalo nuevamente.'
            : 'No se pudo confirmar el acceso. Revisa la conexión y vuelve a intentarlo.');
      },
    });
  }

  /**
   * A dónde ir después de entrar.
   *
   * Si alguien abrió una ruta interna sin sesión (o se le venció mientras
   * trabajaba), el guard deja `volverA` con esa ruta y aquí se respeta. Solo
   * se aceptan rutas internas ("/algo"), nunca URLs externas ni
   * protocol-relative ("//otro-sitio").
   */
  private destinoTrasEntrar(): string {
    const volverA = this.ruta.snapshot.queryParamMap.get('volverA');
    if (volverA && volverA.startsWith('/') && !volverA.startsWith('//')) {
      return volverA;
    }
    return this.auth.rutaInicial();
  }
}

