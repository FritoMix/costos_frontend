import { ChangeDetectionStrategy, Component, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { animacionRuta } from '../core/animaciones/ruta.animacion';
import { environment } from '../../environments/environment';
import type { CodigoRol } from '../core/modelos/identidad.model';
import { ETIQUETAS_ROL } from '../core/modelos/identidad.model';
import { AuthService } from '../core/servicios/auth.service';
import { AvisosComponent } from '../ui/avisos.component';
import { AvisoGrandeComponent } from '../ui/aviso-grande.component';
import { CampanaAvisosComponent } from '../ui/campana-avisos.component';
import { NotificacionesPlantaService } from '../core/servicios/notificaciones-planta.service';

interface OpcionMenu {
  ruta: string;
  texto: string;
  roles: CodigoRol[];
}

/**
 * Navegación y cabecera de DATACONTROL.
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    AvisosComponent,
    AvisoGrandeComponent,
    CampanaAvisosComponent,
  ],
  animations: [animacionRuta],
  template: `
    <div class="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800">
      <header
        class="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-2 border-b border-sky-200 bg-marca-100 px-2.5 sm:px-4"
        (keydown.escape)="cerrarMenu(botonMenu)"
      >
        <a routerLink="/inicio" (click)="menuAbierto.set(false)"
          class="flex min-w-0 shrink items-center gap-1.5 rounded-lg text-xs font-extrabold text-marca-950 sm:gap-2 sm:text-sm">
          <img src="/logo.png" alt="Frito Mix" class="size-8 shrink-0 object-contain sm:size-10" />
          <span>{{ appNombre }}</span>
        </a>

        <nav #menuModulos id="menu-modulos" aria-label="Módulos"
          class="absolute inset-x-0 top-full max-h-[60dvh] grid-cols-2 gap-1 overflow-y-auto border-b border-sky-200 bg-marca-100 p-2 text-marca-950 shadow-lg xl:static xl:flex xl:max-h-none xl:items-center xl:justify-center xl:overflow-visible xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none"
          [class.hidden]="!menuAbierto()"
          [class.grid]="menuAbierto()">
          @for (opcion of menuVisible(); track opcion.ruta) {
            <a
              [routerLink]="opcion.ruta"
              [attr.data-testid]="'nav' + opcion.ruta.replace('/', '-')"
              routerLinkActive="active-link"
              ariaCurrentWhenActive="page"
              [routerLinkActiveOptions]="{ exact: opcion.ruta === '/inicio' }"
              (click)="menuAbierto.set(false)"
              class="nav-link flex min-h-11 items-center justify-center rounded-lg px-3 text-center text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-marca-700 xl:whitespace-nowrap xl:text-xs"
            >
              <span>{{ opcion.texto }}</span>
            </a>
          }
        </nav>

        <div class="flex shrink-0 items-center gap-1.5">
          <app-campana-avisos />
          <a routerLink="/mi-cuenta" aria-label="Mi cuenta" [attr.title]="etiquetaRol()"
            (click)="menuAbierto.set(false)"
            class="grid size-9 place-items-center rounded-full bg-marca-700 text-xs font-bold text-white">
            {{ inicialesUsuario() }}
          </a>
          <button type="button" (click)="auth.cerrarSesion()"
            class="min-h-11 rounded-lg px-1 text-xs font-semibold text-rose-800 hover:bg-rose-50">
            Salir
          </button>
          <button #botonMenu type="button"
            class="grid size-10 place-items-center rounded-lg text-marca-950 hover:bg-marca-200 xl:hidden"
            (click)="alternarMenu(menuModulos)"
            aria-controls="menu-modulos"
            [attr.aria-expanded]="menuAbierto()"
            [attr.aria-label]="menuAbierto() ? 'Cerrar menú' : 'Abrir menú'">
            <svg aria-hidden="true" class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <main class="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        <div class="contenido-ruta min-w-0" [@animacionRuta]="prepararRuta(salida)">
          <router-outlet #salida="outlet" />
        </div>
      </main>
    </div>

    <app-avisos />
    <app-aviso-grande />
  `,
  styles: `
    .nav-link.active-link {
      background-color: var(--color-marca-200);
      color: var(--color-marca-950);
    }

    .nav-link:focus-visible {
      background-color: var(--color-marca-300);
    }

    @media (hover: hover) {
      .nav-link:hover {
        background-color: var(--color-marca-300);
      }
    }
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);
  private readonly avisosPlanta = inject(NotificacionesPlantaService);
  protected readonly appNombre = environment.appNombre;
  protected readonly menuAbierto = signal(false);

  constructor() {
    this.avisosPlanta.iniciar();
  }

  private readonly menu: OpcionMenu[] = [
    { ruta: '/inicio', texto: 'Inicio', roles: ['admin', 'supervisor', 'operario_horno', 'operario_saborizado', 'bodeguero'] },
    { ruta: '/ordenes', texto: 'Órdenes', roles: ['admin', 'supervisor'] },
    { ruta: '/bodega', texto: 'Bodega', roles: ['admin', 'supervisor', 'bodeguero'] },
    { ruta: '/formula-produccion', texto: 'Fórmulas', roles: ['admin', 'bodeguero'] },
    { ruta: '/hornos', texto: 'Hornos', roles: ['supervisor'] },
    { ruta: '/horno', texto: 'Horno', roles: ['admin', 'operario_horno'] },
    { ruta: '/saborizado', texto: 'Saborizado', roles: ['admin', 'operario_saborizado'] },
    { ruta: '/analisis', texto: 'Análisis', roles: ['admin'] },
    { ruta: '/catalogos', texto: 'Catálogos', roles: ['admin'] },
    { ruta: '/usuarios', texto: 'Usuarios', roles: ['admin'] },
  ];

  protected readonly menuVisible = computed(() => {
    const rol = this.auth.rol();
    return rol ? this.menu.filter((opcion) => opcion.roles.includes(rol)) : [];
  });

  protected readonly etiquetaRol = computed(() => {
    const rol = this.auth.rol();
    return rol ? ETIQUETAS_ROL[rol] : '';
  });

  protected readonly inicialesUsuario = computed(() => {
    const nombre = this.auth.usuario()?.nombre_completo || 'DC';
    const partes = nombre.trim().split(' ');
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  });

  protected alternarMenu(menu: HTMLElement): void {
    this.menuAbierto.update((abierto) => !abierto);
    if (this.menuAbierto()) {
      afterNextRender(() => menu.querySelector('a')?.focus(), { injector: this.injector });
    }
  }

  protected cerrarMenu(boton: HTMLButtonElement): void {
    if (this.menuAbierto()) {
      this.menuAbierto.set(false);
      boton.focus();
    }
  }

  protected prepararRuta(salida: RouterOutlet): string {
    return salida?.isActivated
      ? salida.activatedRoute.snapshot.url.map((s) => s.path).join('/')
      : '';
  }
}
