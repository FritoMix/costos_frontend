import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { Usuario } from '../../core/modelos/identidad.model';
import { AuthService } from '../../core/servicios/auth.service';
import { UsuariosService } from '../../core/servicios/usuarios.service';
import { CargandoComponent } from '../../ui/cargando.component';
import { ClaveTemporalComponent } from './clave-temporal.component';

/**
 * Para el supervisor: buscar a la persona que olvidó su contraseña y darle
 * una temporal. Solo usuarios de planta (la API no deja tocar
 * administradores ni otros supervisores).
 */
@Component({
  selector: 'app-recuperar-clave',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CargandoComponent, ClaveTemporalComponent],
  template: `
    <div class="pagina-contenido mx-auto max-w-3xl">
      <header class="border-b border-slate-200/80 pb-5">
        <h1 class="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Recuperar contraseña
        </h1>
        <p class="mt-1 text-sm font-medium text-slate-500">
          Busca a la persona que olvidó su contraseña y dale una temporal. Al entrar, la app le pide
          crear una nueva.
        </p>
      </header>
      <input
        class="campo mt-5"
        placeholder="Buscar por nombre o usuario…"
        aria-label="Buscar usuario"
        [ngModel]="filtro()"
        (ngModelChange)="filtro.set($event)"
      />
      @if (cargando()) {
        <app-cargando texto="Cargando usuarios…" />
      } @else {
        <ul class="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          @for (usuario of visibles(); track usuario.id) {
            <li class="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div>
                <p class="font-bold text-slate-900">{{ usuario.nombre_completo }}</p>
                <p class="text-xs text-slate-500">
                  {{ usuario.nombre_usuario }} · {{ usuario.rol.nombre }}
                </p>
              </div>
              <app-clave-temporal [usuario]="usuario" />
            </li>
          } @empty {
            <li class="px-5 py-6 text-center text-sm text-slate-500">
              Nadie coincide con la búsqueda.
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class RecuperarClavePage {
  private readonly servicio = inject(UsuariosService);
  private readonly auth = inject(AuthService);
  protected readonly cargando = signal(true);
  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly filtro = signal('');

  protected readonly visibles = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    const yo = this.auth.usuario()?.id;
    const esAdmin = this.auth.esAdmin();
    return this.usuarios().filter(
      (u) =>
        u.id !== yo &&
        (esAdmin || !['admin', 'supervisor'].includes(u.rol.codigo)) &&
        (!texto ||
          u.nombre_completo.toLowerCase().includes(texto) ||
          u.nombre_usuario.includes(texto)),
    );
  });

  constructor() {
    this.servicio.paraRecuperar().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }
}
