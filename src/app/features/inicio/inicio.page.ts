import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Orden } from '../../core/modelos/produccion.model';
import { AuthService } from '../../core/servicios/auth.service';
import { OrdenesService } from '../../core/servicios/ordenes.service';
import { CargandoComponent } from '../../ui/cargando.component';
import { EstadoVacioComponent } from '../../ui/estado-vacio.component';
import { EtiquetaEstadoComponent } from '../../ui/etiqueta-estado.component';
import { TarjetaComponent } from '../../ui/tarjeta.component';

interface AccesoRapido {
  ruta: string;
  titulo: string;
  descripcion: string;
  icono: string;
  destacado?: boolean;
}

/**
 * Pantalla de inicio: panel de control operativo futurista en Azul Zafiro Cálido
 * con estado en vivo de la planta y accesos rápidos ergonómicos por rol.
 */
@Component({
  selector: 'app-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TarjetaComponent,
    CargandoComponent,
    EstadoVacioComponent,
    EtiquetaEstadoComponent,
    DecimalPipe,
  ],
  template: `
    <div class="space-y-6 anim-pagina">
      <!-- Hero de bienvenida futurista en Azul Zafiro y Cyan -->
      <div class="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-xl"
           style="background: linear-gradient(135deg, #0c4a6e 0%, #075985 40%, #0284c7 80%, #0369a1 100%);
                  border: 1px solid rgba(255,255,255,0.2);">
        <!-- Resplandor ambiental de fondo -->
        <div class="pointer-events-none absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full opacity-35"
             style="background: radial-gradient(circle, rgba(56,189,248,0.4) 0%, transparent 65%);
                    filter: blur(40px);"></div>
        <div class="pointer-events-none absolute -bottom-10 -left-10 w-[300px] h-[300px] rounded-full opacity-25"
             style="background: radial-gradient(circle, rgba(125,211,252,0.3) 0%, transparent 60%);
                    filter: blur(30px);"></div>

        <div class="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div class="flex items-start gap-4">
            <div class="hidden sm:flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-lg ring-2 ring-white/30 anim-flotar"
                 style="box-shadow: 0 0 24px rgba(56,189,248,0.3), 0 4px 12px rgba(0,0,0,0.15);">
              <img src="/logo.png" alt="Pasabocas Frito Mix" class="h-full w-full object-contain" />
            </div>
            <div>
              <div class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-sky-100 mb-2"
                   style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-300" style="box-shadow: 0 0 8px rgba(52,211,153,0.8);"></span>
                Pasabocas Frito Mix · Control de Planta
              </div>
              <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Hola, {{ auth.usuario()?.nombre_completo }}
              </h1>
              <p class="mt-1 text-sm sm:text-base text-sky-100/90 max-w-xl font-medium">
                Monitoreo y registro en tiempo real de operaciones de producción, horno y saborizado.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:gap-4 shrink-0 escalona">
            <div class="rounded-2xl p-4 text-center transition-all duration-300 hover:scale-[1.02]"
                 style="background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px);">
              <p class="text-[11px] font-bold uppercase tracking-wider text-sky-100/80">Órdenes Activas</p>
              <p class="mt-1 font-mono text-2xl sm:text-3xl font-black text-white tabular-nums">
                {{ enProduccion().length }}
              </p>
            </div>
            <div class="rounded-2xl p-4 text-center transition-all duration-300 hover:scale-[1.02]"
                 style="background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.3); backdrop-filter: blur(10px);">
              <p class="text-[11px] font-bold uppercase tracking-wider text-sky-100">Kg Programados</p>
              <p class="mt-1 font-mono text-2xl sm:text-3xl font-black text-amber-300 tabular-nums" style="text-shadow: 0 0 12px rgba(252,211,77,0.4);">
                {{ totalKgProgramados() | number: '1.0-0' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Sección de Órdenes en Producción Activa -->
      <app-tarjeta
        titulo="En producción activa"
        subtitulo="Lotes y tandas procesándose actualmente en hornos de la planta"
        [sinRelleno]="true"
      >
        @if (cargando()) {
          <app-cargando texto="Cargando órdenes activas…" />
        } @else if (enProduccion().length === 0) {
          <app-estado-vacio
            titulo="No hay órdenes en producción en este momento"
            descripcion="Cuando un supervisor inicie una nueva orden, el lote se reflejará inmediatamente aquí."
          />
        } @else {
          <ul class="divide-y divide-sky-100">
            @for (orden of enProduccion(); track orden.id) {
              <li class="group flex flex-wrap items-center justify-between gap-4 p-5 sm:px-6 transition-all duration-200 hover:bg-sky-50/50">
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2.5">
                    <span class="rounded-xl px-2.5 py-1 font-mono text-xs font-bold text-white shadow-sm"
                          style="background: linear-gradient(135deg, #075985, #0284c7);">
                      #{{ orden.numero_orden }}
                    </span>
                    <h3 class="text-base font-bold text-slate-900 tracking-tight">
                      {{ orden.producto.nombre_comercial }}
                    </h3>
                  </div>

                  <div class="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 font-medium">
                    <span class="inline-flex items-center gap-1">
                      <svg class="h-3.5 w-3.5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                      </svg>
                      {{ orden.horno.nombre }}
                    </span>
                    <span class="text-sky-200">·</span>
                    <span class="inline-flex items-center gap-1">
                      <svg class="h-3.5 w-3.5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {{ orden.turno.nombre }}
                    </span>
                    <span class="text-sky-200">·</span>
                    <span class="font-mono font-semibold text-slate-700">
                      {{ orden.cantidad_programada | number: '1.0-0' }} kg programados
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <app-etiqueta-estado [estado]="orden.estado" [texto]="orden.estado_etiqueta" />
                  @if (auth.rol() === 'admin' || auth.rol() === 'supervisor') {
                    <a
                      [routerLink]="['/ordenes', orden.id]"
                      class="rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-800 shadow-xs hover:border-sky-400 hover:bg-sky-50 transition-all duration-200"
                    >
                      Ver detalle →
                    </a>
                  }
                </div>
              </li>
            }
          </ul>
        }
      </app-tarjeta>

      <!-- Accesos Rápidos del Rol -->
      <div>
        <div class="mb-4">
          <h2 class="text-base font-bold text-slate-900 tracking-tight">Accesos Rápidos Operativos</h2>
          <p class="text-xs text-slate-500 font-medium">Herramientas y funciones disponibles para tu perfil</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 escalona">
          @for (acceso of accesos(); track acceso.ruta) {
            <a
              [routerLink]="acceso.ruta"
              class="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-sky-100/90 bg-white/85 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-200/30"
              style="backdrop-filter: blur(8px);"
            >
              <!-- Hover glow -->
              <div class="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                   style="background: radial-gradient(circle, rgba(56,189,248,0.4) 0%, transparent 70%);"></div>

              <div class="relative">
                <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 text-sky-600 ring-1 ring-sky-200/70 group-hover:from-sky-500 group-hover:to-blue-600 group-hover:text-white group-hover:ring-sky-400/40 transition-all duration-300 mb-4 group-hover:shadow-md group-hover:shadow-sky-500/20">
                  <span [innerHTML]="acceso.icono"></span>
                </div>
                <h3 class="text-base font-bold text-slate-900 tracking-tight group-hover:text-sky-700 transition duration-200">
                  {{ acceso.titulo }}
                </h3>
                <p class="mt-1 text-xs text-slate-500 font-medium leading-relaxed">{{ acceso.descripcion }}</p>
              </div>

              <div class="relative mt-4 flex items-center gap-1 text-xs font-bold text-sky-600">
                <span>Ingresar</span>
                <svg class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </a>
          }
        </div>
      </div>
    </div>
  `,
})
export class InicioPage {
  private readonly ordenes = inject(OrdenesService);
  protected readonly auth = inject(AuthService);

  protected readonly cargando = signal(true);
  protected readonly enProduccion = signal<Orden[]>([]);

  protected readonly totalKgProgramados = computed(() =>
    this.enProduccion().reduce((acc, ord) => acc + (Number(ord.cantidad_programada) || 0), 0)
  );

  constructor() {
    this.ordenes.listar({ estado: 'en_produccion', soloPropias: false }).subscribe({
      next: (ordenes) => {
        this.enProduccion.set(ordenes);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected accesos(): AccesoRapido[] {
    switch (this.auth.rol()) {
      case 'supervisor':
        return [
          {
            ruta: '/ordenes/nueva',
            titulo: 'Nueva Orden',
            descripcion: 'Crear y programar una orden de producción con lotes de producto.',
            icono: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>',
          },
          {
            ruta: '/ordenes',
            titulo: 'Mis Órdenes',
            descripcion: 'Iniciar, finalizar, corregir o consultar el estado de tus órdenes.',
            icono: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>',
          },
        ];
      case 'operario_horno':
        return [
          {
            ruta: '/horno',
            titulo: 'Registrar Tanda en Horno',
            descripcion: 'Registrar bultos de plátano, aceite consumido, temperatura y desperdicio.',
            icono: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /></svg>',
          },
        ];
      case 'operario_saborizado':
        return [
          {
            ruta: '/saborizado',
            titulo: 'Registrar Recepción y Sabor',
            descripcion: 'Pesar canastilla por canastilla y registrar adición de saborizante.',
            icono: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-16.5-.52l-.54.075A2.25 2.25 0 003 7.27v7.46c0 1.096.786 2.03 1.875 2.18m14.25-11.94c.36.052.716.11 1.07.175A2.25 2.25 0 0122 7.27v7.46c0 1.096-.786 2.03-1.875 2.18" /></svg>',
          },
        ];
      default:
        return [
          {
            ruta: '/analisis',
            titulo: 'Métricas & Análisis KPI',
            descripcion: 'Indicadores por categoría, rendimientos de aceite y exportación Excel.',
            icono: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>',
          },
          {
            ruta: '/ordenes',
            titulo: 'Gestión de Órdenes',
            descripcion: 'Listado completo de órdenes programadas, en curso y finalizadas.',
            icono: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>',
          },
          {
            ruta: '/catalogos',
            titulo: 'Catálogos Maestros',
            descripcion: 'Configuración de productos, hornos, turnos y densidades.',
            icono: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>',
          },
        ];
    }
  }
}
