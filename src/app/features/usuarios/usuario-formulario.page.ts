import { protegerRecarga } from '../../core/guards/cambios.guard';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import type { Linea } from '../../core/modelos/catalogos.model';
import type { Rol, UsuarioGuardar } from '../../core/modelos/identidad.model';
import { ROLES_DE_LINEA } from '../../core/modelos/identidad.model';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { UsuariosService } from '../../core/servicios/usuarios.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { TarjetaComponent } from '../../ui/tarjeta.component';

/** Crear o corregir un usuario (solo Administrador). */
@Component({
  selector: 'app-usuario-formulario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.inert]': 'enviando() ? "" : null' },
  imports: [ReactiveFormsModule, RouterLink, TarjetaComponent, BotonComponent, CargandoComponent],
  template: `
    <div class="pagina-contenido mx-auto max-w-2xl">
      <header>
        <a
          routerLink="/usuarios"
          class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Volver a usuarios
        </a>
        <h1 class="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          {{ id() ? 'Corregir usuario' : 'Nuevo usuario' }}
        </h1>
        <p class="mt-1 text-sm text-slate-500 font-medium">
          Asigna credenciales, rol y estado de acceso al sistema de control de planta.
        </p>
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

            @if (pideLinea() && lineasDelRol().length > 0) {
              <div>
                <label class="etiqueta" for="linea">Línea de producción</label>
                <select id="linea" class="campo" formControlName="linea_id">
                  @for (linea of lineasDelRol(); track linea.id) {
                    <option [ngValue]="linea.id">{{ linea.nombre }}</option>
                  }
                </select>
                <p class="ayuda">Solo verá y registrará las órdenes de esta línea.</p>
              </div>
            }

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
  cambiosPendientes(): boolean {
    return this.formulario.dirty || this.enviando();
  }

  readonly id = input<string | undefined>();

  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(UsuariosService);
  private readonly avisos = inject(NotificacionesService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly roles = signal<Rol[]>([]);
  protected readonly lineas = signal<Linea[]>([]);
  private readonly catalogos = inject(CatalogosService);

  protected readonly formulario = this.fb.group({
    nombre_completo: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(3),
    ]),
    nombre_usuario: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    rol_id: this.fb.control<number | null>(null, Validators.required),
    linea_id: this.fb.control<number | null>(null),
    password: this.fb.control<string | null>(null),
    activo: this.fb.nonNullable.control(true),
  });

  private readonly rolElegido = signal<number | null>(null);

  /** Operarios y Bodega trabajan en una línea; admin y supervisor ven todas. */
  protected readonly pideLinea = computed(() => {
    const rol = this.roles().find((r) => r.id === this.rolElegido());
    return !!rol && ROLES_DE_LINEA.includes(rol.codigo);
  });

  /** Bodega solo existe en las líneas que la usan (la papa). */
  protected readonly lineasDelRol = computed(() => {
    const rol = this.roles().find((r) => r.id === this.rolElegido());
    return this.lineas().filter((l) => l.activo && (rol?.codigo !== 'bodeguero' || l.usa_bodega));
  });

  constructor() {
    this.formulario.controls.rol_id.valueChanges.subscribe((id) => {
      this.rolElegido.set(id);
      const linea = this.formulario.controls.linea_id.value;
      if (this.pideLinea() && !this.lineasDelRol().some((l) => l.id === linea)) {
        this.formulario.controls.linea_id.setValue(
          this.lineasDelRol().find((l) => l.codigo === 'papa')?.id ??
            this.lineasDelRol()[0]?.id ??
            null,
        );
      }
    });
    protegerRecarga(() => this.cambiosPendientes());
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
      lineas: this.catalogos.listarLineas().pipe(catchError(() => of([] as Linea[]))),
      // Al crear no hay usuario que traer: se resuelve con null de una vez.
      usuario: id ? this.servicio.detalle(Number(id)) : of(null),
    }).subscribe({
      next: ({ roles, lineas, usuario }) => {
        this.roles.set(roles);
        this.lineas.set(lineas);
        if (usuario) {
          this.formulario.patchValue({
            nombre_completo: usuario.nombre_completo,
            nombre_usuario: usuario.nombre_usuario,
            linea_id: usuario.linea?.id ?? null,
            rol_id: usuario.rol.id,
            activo: usuario.activo,
          });
          this.formulario.markAsPristine();
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
    if (this.enviando()) return;
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
    // Solo operarios y Bodega llevan línea; sin elegir, la API deja papa.
    if (this.pideLinea() && valores.linea_id !== null) {
      datos.linea_id = valores.linea_id;
    }
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
        this.formulario.markAsPristine();
        this.enviando.set(false);
        this.avisos.exito(id ? 'Usuario actualizado.' : 'Usuario creado.');
        void this.router.navigate(['/usuarios']);
      },
      error: () => this.enviando.set(false),
    });
  }
}
