import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';

import type { Rol, UsuarioGuardar } from '../../core/modelos/identidad.model';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { UsuariosService } from '../../core/servicios/usuarios.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { TarjetaComponent } from '../../ui/tarjeta.component';

/** Crear o corregir un usuario (solo Administrador). */
@Component({
  selector: 'app-usuario-formulario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TarjetaComponent, BotonComponent, CargandoComponent],
  template: `
    <div class="mx-auto max-w-2xl space-y-6">
      <header>
        <a routerLink="/usuarios" class="text-sm font-semibold text-marca-700 hover:underline"
          >← Volver a usuarios</a
        >
        <h1 class="mt-2 text-2xl font-bold text-slate-800">
          {{ id() ? 'Corregir usuario' : 'Nuevo usuario' }}
        </h1>
      </header>

      @if (cargando()) {
        <app-cargando />
      } @else {
        <app-tarjeta>
          <form [formGroup]="formulario" (ngSubmit)="guardar()" class="space-y-5">
            <div>
              <label class="etiqueta" for="nombre">Nombre completo</label>
              <input id="nombre" type="text" class="campo" formControlName="nombre_completo" />
            </div>

            <div>
              <label class="etiqueta" for="usuario">Nombre de usuario</label>
              <input
                id="usuario"
                type="text"
                class="campo"
                formControlName="nombre_usuario"
                autocapitalize="none"
                spellcheck="false"
              />
              <p class="ayuda">Con este nombre entra a la app. Sin espacios ni tildes.</p>
            </div>

            <div>
              <label class="etiqueta" for="rol">Rol</label>
              <select id="rol" class="campo" formControlName="rol_id">
                <option [ngValue]="null" disabled>Selecciona…</option>
                @for (rol of roles(); track rol.id) {
                  <option [ngValue]="rol.id">{{ rol.nombre }}</option>
                }
              </select>
            </div>

            <div>
              <label class="etiqueta" for="password">
                {{ id() ? 'Contraseña nueva (opcional)' : 'Contraseña' }}
              </label>
              <input
                id="password"
                type="password"
                class="campo"
                formControlName="password"
                autocomplete="new-password"
                [class.campo-invalido]="invalidoPassword()"
              />
              <p class="ayuda">
                @if (id()) {
                  Déjala vacía si no quieres cambiarla. Mínimo 8 caracteres.
                } @else {
                  Mínimo 8 caracteres. El usuario puede cambiarla después desde "Mi cuenta".
                }
              </p>
            </div>

            <label class="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" formControlName="activo" class="h-4 w-4" />
              Activo (puede entrar a la app)
            </label>

            <div class="flex flex-wrap gap-3">
              <app-boton tipo="submit" [cargando]="enviando()">
                {{ id() ? 'Guardar cambios' : 'Crear usuario' }}
              </app-boton>
              <a routerLink="/usuarios"><app-boton variante="secundario">Cancelar</app-boton></a>
            </div>
          </form>
        </app-tarjeta>
      }
    </div>
  `,
})
export class UsuarioFormularioPage {
  readonly id = input<string | undefined>();

  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(UsuariosService);
  private readonly avisos = inject(NotificacionesService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly roles = signal<Rol[]>([]);

  protected readonly formulario = this.fb.group({
    nombre_completo: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    nombre_usuario: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    rol_id: this.fb.control<number | null>(null, Validators.required),
    password: this.fb.control<string | null>(null),
    activo: this.fb.nonNullable.control(true),
  });

  constructor() {
    queueMicrotask(() => this.cargar());
  }

  private cargar(): void {
    const id = this.id();
    // Al crear, la contrasena es obligatoria; al corregir, opcional.
    this.formulario.controls.password.setValidators(
      id ? [Validators.minLength(8)] : [Validators.required, Validators.minLength(8)],
    );

    forkJoin({
      roles: this.servicio.roles(),
      // Al crear no hay usuario que traer: se resuelve con null de una vez.
      usuario: id ? this.servicio.detalle(Number(id)) : of(null),
    }).subscribe({
      next: ({ roles, usuario }) => {
        this.roles.set(roles);
        if (usuario) {
          this.formulario.patchValue({
            nombre_completo: usuario.nombre_completo,
            nombre_usuario: usuario.nombre_usuario,
            rol_id: usuario.rol.id,
            activo: usuario.activo,
          });
        }
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected invalidoPassword(): boolean {
    const control = this.formulario.controls.password;
    return control.invalid && control.touched;
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.avisos.error('Revisa los datos del formulario.');
      return;
    }

    const valores = this.formulario.getRawValue();
    const datos: UsuarioGuardar = {
      nombre_completo: valores.nombre_completo,
      nombre_usuario: valores.nombre_usuario,
      rol_id: valores.rol_id!,
      activo: valores.activo,
    };
    if (valores.password) {
      datos.password = valores.password;
    }

    const id = this.id();
    this.enviando.set(true);
    const peticion = id
      ? this.servicio.actualizar(Number(id), datos)
      : this.servicio.crear(datos as UsuarioGuardar & { password: string });

    peticion.subscribe({
      next: () => {
        this.enviando.set(false);
        this.avisos.exito(id ? 'Usuario actualizado.' : 'Usuario creado.');
        void this.router.navigate(['/usuarios']);
      },
      error: () => this.enviando.set(false),
    });
  }
}
