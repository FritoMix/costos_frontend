import { ChangeDetectionStrategy, Component, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, PRIMARY_OUTLET, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

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
    AvisosComponent,
    AvisoGrandeComponent,
    CampanaAvisosComponent,
  ],
  animations: [animacionRuta],
  template: `
    <div class="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-900">
      <header
        class="sticky top-0 z-30 flex min-h-17 items-center justify-between gap-3 bg-marca-950 px-3 text-white shadow-md shadow-marca-950/20 sm:px-5"
        (keydown.escape)="cerrarMenu(botonMenu)"
      >
        <a routerLink="/inicio" [attr.aria-label]="appNombre" (click)="menuAbierto.set(false)"
          class="flex min-w-0 shrink items-center gap-2.5 rounded-lg text-sm font-extrabold tracking-wide text-white focus-visible:outline-2 focus-visible:outline-marca-300 sm:text-base">
          <span class="grid size-10 shrink-0 place-items-center">
            <img src="/logo.png" alt="Frito Mix" class="size-8 object-contain" />
          </span>
          <span class="hidden min-[380px]:inline">{{ appNombre }}</span>
        </a>

        <nav #menuModulos id="menu-modulos" aria-label="Módulos"
          class="absolute inset-x-0 top-full max-h-[60dvh] grid-cols-2 gap-1 overflow-y-auto border-t border-white/10 bg-marca-950 p-2 text-white shadow-lg xl:static xl:flex xl:max-h-none xl:items-center xl:justify-center xl:gap-0.5 xl:overflow-visible xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none"
          [class.hidden]="!menuAbierto()"
          [class.grid]="menuAbierto()">
          @for (opcion of menuVisible(); track opcion.ruta) {
            <a
              [routerLink]="opcion.ruta"
              [attr.data-testid]="'nav' + opcion.ruta.replace('/', '-')"
              [class.active-link]="moduloActivo() === opcion.ruta"
              [attr.aria-current]="moduloActivo() === opcion.ruta ? 'page' : null"
              (click)="menuAbierto.set(false)"
              class="nav-link flex min-h-11 items-center justify-center rounded-lg px-3.5 text-center text-[0.95rem] font-semibold text-slate-200 transition-colors focus-visible:outline-2 focus-visible:outline-marca-300 xl:whitespace-nowrap xl:text-[0.9rem]"
            >
              <span>{{ opcion.texto }}</span>
            </a>
          }
        </nav>

        <div class="flex shrink-0 items-center gap-1.5">
          <app-campana-avisos />
          <a routerLink="/mi-cuenta" aria-label="Mi cuenta" [attr.title]="etiquetaRol()"
            (click)="menuAbierto.set(false)"
            class="grid size-10 place-items-center rounded-full bg-marca-500 text-sm font-bold text-white ring-2 ring-white/20 hover:bg-marca-400 focus-visible:outline-2 focus-visible:outline-marca-300">
            {{ inicialesUsuario() }}
          </a>
          <button type="button" aria-label="Salir" (click)="auth.cerrarSesion()"
            class="flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-slate-200 hover:bg-white hover:text-white focus-visible:outline-2 focus-visible:outline-marca-300">
            <svg aria-hidden="true" class="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l5-5-5-5"/><path d="M15 12H4"/></svg>
            <span class="hidden sm:inline">Salir</span>
          </button>
          <button #botonMenu type="button"
            class="grid size-11 place-items-center rounded-lg text-white hover:bg-white xl:hidden"
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
        <div class="contenido-ruta relative min-w-0" [@animacionRuta]="prepararRuta(salida)">
          <router-outlet #salida="outlet" />
        </div>
      </main>
    </div>

    <app-avisos />
    <app-aviso-grande />
  `,
  styles: `
    .nav-link.active-link {
      background-color: #ffffff;
      color: var(--color-marca-950);
      font-weight: 700;
    }

    .nav-link:focus-visible {
      background-color: rgb(255 255 255 / 0.12);
    }

    @media (hover: hover) {
      .nav-link:not(.active-link):hover {
        background-color: rgb(255 255 255 / 0.1);
        color: #ffffff;
      }
    }
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly avisosPlanta = inject(NotificacionesPlantaService);
  protected readonly appNombre = environment.appNombre;
  protected readonly menuAbierto = signal(false);
  private readonly urlActual = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly moduloActivo = computed(() => {
    const segmentos = this.router.parseUrl(this.urlActual()).root.children[PRIMARY_OUTLET]?.segments;
    return segmentos?.length ? `/${segmentos[0].path}` : null;
  });

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
