import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { animacionRuta } from '../core/animaciones/ruta.animacion';
import { environment } from '../../environments/environment';
import type { CodigoRol } from '../core/modelos/identidad.model';
import { ETIQUETAS_ROL } from '../core/modelos/identidad.model';
import { AuthService } from '../core/servicios/auth.service';
import { AvisosComponent } from '../ui/avisos.component';
import { CampanaAvisosComponent } from '../ui/campana-avisos.component';
import { NotificacionesPlantaService } from '../core/servicios/notificaciones-planta.service';

interface OpcionMenu {
  ruta: string;
  texto: string;
  icono: string;
  roles: CodigoRol[];
}

/**
 * Marco de la aplicación: Barra lateral en Azul Cálido Zafiro con glassmorphism,
 * cabecera clara y luminosa con acentos azul turquesa.
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AvisosComponent, CampanaAvisosComponent, DatePipe],
  animations: [animacionRuta],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-calido-50 via-sky-50/40 to-blue-50/30 flex flex-col lg:flex-row font-sans text-slate-800">
      <!-- Mobile Backdrop Overlay -->
      @if (menuAbierto()) {
        <div
          class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          (click)="menuAbierto.set(false)"
        >
        </div>
      }

      <!-- Menú lateral Azul Cálido Zafiro -->
      <aside
        class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col transition-transform duration-300 ease-in-out lg:static lg:w-68 lg:shrink-0 lg:translate-x-0 shadow-2xl lg:shadow-xl"
        style="background: linear-gradient(180deg, #0c4a6e 0%, #075985 40%, #0369a1 80%, #0284c7 100%); border-right: 1px solid rgba(255,255,255,0.15);"
        [class.-translate-x-full]="!menuAbierto()"
        [class.translate-x-0]="menuAbierto()"
      >
        <!-- Logo & Marca -->
        <div class="flex items-center justify-between px-5 py-4" style="border-bottom: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.12);">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white p-1 shadow-lg ring-2 ring-sky-300/30">
              <img src="/logo.png" alt="Pasabocas Frito Mix" class="h-full w-full object-contain" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-sm font-black tracking-wider text-white uppercase">{{ appNombre }}</p>
                <span class="rounded-lg px-1.5 py-0.5 text-[9px] font-bold text-sky-200 border border-sky-300/30" style="background: rgba(255,255,255,0.15);">PROD</span>
              </div>
              <p class="text-xs font-medium text-sky-200/80">Pasabocas Frito Mix</p>
            </div>
          </div>
          <!-- Close button on mobile -->
          <button
            type="button"
            class="rounded-lg p-1.5 text-sky-200/70 hover:bg-white/10 hover:text-white lg:hidden transition-all duration-200"
            (click)="menuAbierto.set(false)"
            aria-label="Cerrar menú"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Indicador de estado de planta -->
        <div class="mx-4 mt-4 mb-2 flex items-center justify-between rounded-2xl px-3.5 py-2.5" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15);">
          <div class="flex items-center gap-2.5">
            <span class="relative flex h-2.5 w-2.5">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75"></span>
              <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" style="box-shadow: 0 0 8px rgba(52,211,153,0.7);"></span>
            </span>
            <span class="text-xs font-bold text-white">Planta Operativa</span>
          </div>
          <span class="text-[11px] font-mono font-semibold text-sky-100/90">{{ fechaActual | date: 'HH:mm' }}</span>
        </div>

        <!-- Navegación -->
        <nav class="flex-1 space-y-1 px-3.5 py-3 overflow-y-auto">
          <p class="px-3 pt-2 pb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-sky-200/60">Módulos</p>
          @for (opcion of menuVisible(); track opcion.ruta) {
            <a
              [routerLink]="opcion.ruta"
              routerLinkActive="active-link"
              [routerLinkActiveOptions]="{ exact: opcion.ruta === '/inicio' }"
              (click)="menuAbierto.set(false)"
              class="group flex items-center gap-3.5 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-sky-100/90 transition-all duration-200 hover:text-white"
              style="position: relative;"
            >
              <span
                class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style="background: rgba(255,255,255,0.12);"
              ></span>
              <span class="relative flex h-5 w-5 shrink-0 items-center justify-center text-sky-200/70 group-hover:text-white group-[.active-link]:text-white transition-colors duration-200" [innerHTML]="obtenerSvgIcono(opcion.icono)"></span>
              <span class="relative truncate">{{ opcion.texto }}</span>
            </a>
          }
        </nav>

        <!-- Perfil de Usuario en Barra Lateral -->
        <div class="p-4" style="border-top: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.08);">
          <div class="flex items-center gap-3 rounded-2xl p-3" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.12);">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white font-extrabold text-xs text-marca-700 shadow-sm">
              {{ inicialesUsuario() }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-bold text-white">{{ auth.usuario()?.nombre_completo }}</p>
              <p class="truncate text-[11px] font-semibold text-sky-200">{{ etiquetaRol() }}</p>
            </div>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-2">
            <a
              routerLink="/mi-cuenta"
              (click)="menuAbierto.set(false)"
              class="flex items-center justify-center rounded-xl px-2.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-all duration-200 shadow-2xs"
              style="background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);"
            >
              Mi cuenta
            </a>
            <button
              type="button"
              (click)="auth.cerrarSesion()"
              class="flex items-center justify-center rounded-xl px-2.5 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-600/30 transition-all duration-200 shadow-2xs"
              style="background: rgba(225,29,72,0.2); border: 1px solid rgba(255,255,255,0.2);"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>

      <!-- Área Principal con Top Header Luminoso -->
      <div class="flex min-w-0 flex-1 flex-col">
        <!-- Barra Superior Clara con Glassmorphism -->
        <header
          class="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-sky-100/90 px-5 sm:px-8"
          style="background: rgba(244,249,253,0.85); backdrop-filter: blur(16px) saturate(1.3);"
        >
          <div class="flex items-center gap-4">
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200 text-sky-700 hover:bg-sky-50 hover:border-sky-300 lg:hidden transition-all duration-200"
              (click)="alternarMenu()"
              [attr.aria-expanded]="menuAbierto()"
              aria-label="Abrir menú"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div class="hidden sm:flex items-center gap-3">
              <div class="h-9 w-9 rounded-xl bg-white p-0.5 border border-sky-200 shadow-sm flex items-center justify-center">
                <img src="/logo.png" alt="Pasabocas Frito Mix" class="h-full w-full object-contain" />
              </div>
              <div>
                <span class="text-[11px] font-bold uppercase tracking-wider text-sky-600 block leading-none">Sistema de Control</span>
                <p class="text-sm font-extrabold text-slate-900 mt-0.5">DATACONTROL <span class="font-normal text-slate-500">· Pasabocas Frito Mix</span></p>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 sm:gap-4">
            <div class="hidden md:flex items-center gap-2 rounded-xl bg-white/80 border border-sky-200/80 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs" style="backdrop-filter: blur(8px);">
              <svg class="h-4 w-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span class="capitalize">{{ fechaActual | date: 'EEEE, d MMMM yyyy' }}</span>
            </div>

            <div class="flex items-center gap-2.5">
              <app-campana-avisos />
              <span class="hidden rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 px-3 py-1.5 text-xs font-bold text-sky-900 border border-sky-200/80 sm:inline-block">
                {{ etiquetaRol() }}
              </span>
            </div>
          </div>
        </header>

        <!-- Contenedor Principal -->
        <main class="min-w-0 flex-1 p-5 sm:p-7 lg:p-9 max-w-7xl w-full mx-auto">
          <div [@animacionRuta]="prepararRuta(salida)">
            <router-outlet #salida="outlet" />
          </div>
        </main>
      </div>
    </div>

    <app-avisos />
  `,
  styles: `
    :host ::ng-deep .active-link {
      background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%) !important;
      color: white !important;
      font-weight: 700 !important;
      box-shadow: 0 4px 16px rgba(56,189,248,0.35), 0 0 0 1px rgba(255,255,255,0.2) inset;
    }
    :host ::ng-deep .active-link span {
      color: white !important;
    }
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly avisosPlanta = inject(NotificacionesPlantaService);
  protected readonly appNombre = environment.appNombre;
  protected readonly menuAbierto = signal(false);
  protected readonly fechaActual = new Date();

  constructor() {
    this.avisosPlanta.iniciar();
  }

  private readonly menu: OpcionMenu[] = [
    { ruta: '/inicio', texto: 'Inicio', icono: 'inicio', roles: ['admin', 'supervisor', 'operario_horno', 'operario_saborizado'] },
    { ruta: '/ordenes', texto: 'Órdenes', icono: 'ordenes', roles: ['admin', 'supervisor'] },
    { ruta: '/horno', texto: 'Registro Horno', icono: 'horno', roles: ['admin', 'operario_horno'] },
    { ruta: '/saborizado', texto: 'Saborizado', icono: 'saborizado', roles: ['admin', 'operario_saborizado'] },
    { ruta: '/analisis', texto: 'Análisis & KPI', icono: 'analisis', roles: ['admin'] },
    { ruta: '/catalogos', texto: 'Catálogos', icono: 'catalogos', roles: ['admin'] },
    { ruta: '/usuarios', texto: 'Usuarios', icono: 'usuarios', roles: ['admin'] },
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

  protected alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  protected prepararRuta(salida: RouterOutlet): string {
    return salida?.isActivated
      ? salida.activatedRoute.snapshot.url.map((s) => s.path).join('/')
      : '';
  }

  protected obtenerSvgIcono(tipo: string): string {
    switch (tipo) {
      case 'inicio':
        return '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>';
      case 'ordenes':
        return '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>';
      case 'horno':
        return '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.4A3.75 3.75 0 0012 18z" /></svg>';
      case 'saborizado':
        return '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-16.5-.52l-.54.075A2.25 2.25 0 003 7.27v7.46c0 1.096.786 2.03 1.875 2.18m14.25-11.94c.36.052.716.11 1.07.175A2.25 2.25 0 0122 7.27v7.46c0 1.096-.786 2.03-1.875 2.18" /></svg>';
      case 'analisis':
        return '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>';
      case 'catalogos':
        return '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>';
      case 'usuarios':
        return '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>';
      default:
        return '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>';
    }
  }
}
