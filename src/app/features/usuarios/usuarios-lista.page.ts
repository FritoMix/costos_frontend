import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Usuario } from '../../core/modelos/identidad.model';
import { AuthService } from '../../core/servicios/auth.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { UsuariosService } from '../../core/servicios/usuarios.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { ConfirmarComponent } from '../../ui/confirmar.component';
import { TarjetaComponent } from '../../ui/tarjeta.component';

/** Gestión de usuarios y permisos del sistema (Exclusivo Administrador). */
@Component({
  selector: 'app-usuarios-lista',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TarjetaComponent, BotonComponent, CargandoComponent, ConfirmarComponent],
  template: `
    <div class="space-y-6">
      <header class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Usuarios & Accesos</h1>
            <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-mono font-bold text-slate-600 border border-slate-200">
              {{ usuarios().length }}
            </span>
          </div>
          <p class="mt-1 text-sm text-slate-500 font-medium max-w-2xl">
            Control de cuentas autorizadas en planta, roles de supervisión y asignación de permisos.
          </p>
        </div>
        <a routerLink="/usuarios/nuevo">
          <app-boton variante="primario">
            + Nuevo Usuario
          </app-boton>
        </a>
      </header>

      <app-tarjeta [sinRelleno]="true">
        @if (cargando()) {
          <app-cargando texto="Cargando usuarios autorizados…" />
        } @else {
          <div class="overflow-x-auto">
            <table class="tabla">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Nombre de Usuario</th>
                  <th>Rol Asignado</th>
                  <th>Estado</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (usuario of usuarios(); track usuario.id) {
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td>
                      <div class="flex items-center gap-3">
                        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 font-mono text-xs font-bold text-slate-700 border border-slate-200/80">
                          {{ iniciales(usuario.nombre_completo) }}
                        </span>
                        <div>
                          <div class="font-bold text-slate-900">{{ usuario.nombre_completo }}</div>
                          @if (usuario.id === auth.usuario()?.id) {
                            <span class="text-[10px] font-bold text-marca-700 uppercase tracking-wide">Tu sesión actual</span>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="font-mono text-xs text-slate-600">
                      {{ usuario.nombre_usuario }}
                    </td>
                    <td>
                      <span
                        class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold"
                        [class]="badgeRolClases(usuario.rol.codigo)"
                      >
                        {{ usuario.rol.nombre }}
                      </span>
                    </td>
                    <td>
                      @if (usuario.activo) {
                        <span class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                          <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                          Activo
                        </span>
                      } @else {
                        <span class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                          <span class="h-2 w-2 rounded-full bg-slate-300"></span>
                          Inactivo
                        </span>
                      }
                    </td>
                    <td class="text-right whitespace-nowrap">
                      <div class="flex items-center justify-end gap-2">
                        <a
                          [routerLink]="['/usuarios', usuario.id]"
                          class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-marca-700 transition"
                        >
                          Editar
                        </a>
                        @if (usuario.id !== auth.usuario()?.id) {
                          <button
                            type="button"
                            class="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-bold text-red-600 shadow-2xs hover:bg-red-50 transition"
                            (click)="aEliminar.set(usuario)"
                          >
                            Eliminar
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </app-tarjeta>
    </div>

    <app-confirmar
      [abierto]="aEliminar() !== null"
      [titulo]="'¿Eliminar a ' + (aEliminar()?.nombre_completo ?? '') + '?'"
      mensaje="No podrá volver a entrar a la app. Las órdenes y registros históricos que haya creado se conservarán intactos."
      textoConfirmar="Sí, eliminar usuario"
      [peligroso]="true"
      (confirmado)="eliminar()"
      (cancelado)="aEliminar.set(null)"
    />
  `,
})
export class UsuariosListaPage {
  private readonly servicio = inject(UsuariosService);
  private readonly avisos = inject(NotificacionesService);
  protected readonly auth = inject(AuthService);

  protected readonly cargando = signal(true);
  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly aEliminar = signal<Usuario | null>(null);

  constructor() {
    this.cargar();
  }

  protected iniciales(nombre: string): string {
    return nombre
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  protected badgeRolClases(codigo: string): string {
    switch (codigo) {
      case 'admin':
        return 'bg-purple-50 text-purple-800 border border-purple-200/70';
      case 'supervisor':
        return 'bg-blue-50 text-blue-800 border border-blue-200/70';
      case 'operario_horno':
        return 'bg-amber-50 text-amber-900 border border-amber-200/70';
      case 'operario_saborizado':
        return 'bg-emerald-50 text-emerald-800 border border-emerald-200/70';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  }

  private cargar(): void {
    this.cargando.set(true);
    this.servicio.listar().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected eliminar(): void {
    const usuario = this.aEliminar();
    this.aEliminar.set(null);
    if (!usuario) {
      return;
    }
    this.servicio.eliminar(usuario.id).subscribe(() => {
      this.avisos.exito(`${usuario.nombre_completo} fue eliminado.`);
      this.cargar();
    });
  }
}

