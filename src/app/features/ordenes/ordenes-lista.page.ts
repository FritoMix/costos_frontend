import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { EstadoOrden, Orden } from '../../core/modelos/produccion.model';
import { AuthService } from '../../core/servicios/auth.service';
import { OrdenesService } from '../../core/servicios/ordenes.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { EstadoVacioComponent } from '../../ui/estado-vacio.component';
import { EtiquetaEstadoComponent } from '../../ui/etiqueta-estado.component';
import { TarjetaComponent } from '../../ui/tarjeta.component';

/** Listado de órdenes con filtro y vista industrial de alto rendimiento. */
@Component({
  selector: 'app-ordenes-lista',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    TarjetaComponent,
    BotonComponent,
    CargandoComponent,
    EstadoVacioComponent,
    EtiquetaEstadoComponent,
  ],
  template: `
    <div class="space-y-6">
      <header class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Órdenes de Producción</h1>
            <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-mono font-bold text-slate-600 border border-slate-200">
              {{ ordenes().length }}
            </span>
          </div>
          <p class="mt-1 text-sm text-slate-500 font-medium">
            {{ auth.esAdmin() ? 'Registro maestro de todas las órdenes de la planta.' : 'Órdenes asignadas y creadas bajo tu supervisión.' }}
          </p>
        </div>
        @if (auth.esSupervisor() || auth.esAdmin()) {
          <a routerLink="/ordenes/nueva">
            <app-boton variante="primario" icono="nueva">
              + Nueva Orden
            </app-boton>
          </a>
        }
      </header>

      <!-- Segmented filter controls -->
      <div class="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-1.5 border border-slate-200/80 shadow-2xs">
        @for (opcion of filtros; track opcion.valor) {
          <button
            type="button"
            (click)="cambiarFiltro(opcion.valor)"
            class="rounded-xl px-4 py-2 text-xs sm:text-sm font-bold tracking-tight transition-all duration-150"
            [class]="
              filtro() === opcion.valor
                ? 'bg-slate-950 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            "
          >
            {{ opcion.texto }}
          </button>
        }
      </div>

      <app-tarjeta [sinRelleno]="true">
        @if (cargando()) {
          <app-cargando texto="Cargando listado de órdenes…" />
        } @else if (ordenes().length === 0) {
          <app-estado-vacio
            titulo="No se encontraron órdenes con el filtro seleccionado"
            descripcion="Intenta seleccionar otro estado en las pestañas superiores o registra una nueva orden."
          />
        } @else {
          <div class="overflow-x-auto">
            <table class="tabla">
              <thead>
                <tr>
                  <th class="w-32">Orden</th>
                  <th>Fecha</th>
                  <th>Producto / Lote</th>
                  <th>Horno</th>
                  <th>Programado</th>
                  <th>Estado</th>
                  <th class="text-right w-24">Acción</th>
                </tr>
              </thead>
              <tbody>
                @for (orden of ordenes(); track orden.id) {
                  <tr class="group hover:bg-slate-50/80 transition-colors">
                    <td class="whitespace-nowrap">
                      <div class="flex items-center gap-1.5">
                        <span class="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 text-xs">
                          #{{ orden.numero_orden }}
                        </span>
                        @if (orden.destino === 'exportacion') {
                          <span class="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200">
                            EXP
                          </span>
                        }
                      </div>
                    </td>
                    <td class="whitespace-nowrap font-mono text-xs text-slate-600">
                      {{ orden.fecha | date: 'dd/MM/yyyy' }}
                    </td>
                    <td>
                      <div class="font-bold text-slate-900">{{ orden.producto.nombre_comercial }}</div>
                      <div class="mt-0.5 flex items-center gap-1 text-xs text-slate-500 font-medium">
                        <span>{{ orden.categoria.nombre }}</span>
                      </div>
                    </td>
                    <td class="whitespace-nowrap">
                      <span class="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100/70 px-2 py-1 rounded-lg border border-slate-200/50">
                        {{ orden.horno.nombre }}
                      </span>
                    </td>
                    <td class="whitespace-nowrap tabular-nums">
                      <div class="font-mono font-bold text-slate-900">
                        {{ orden.cantidad_programada | number: '1.0-2' }} <span class="text-xs font-semibold text-slate-500 font-sans">kg</span>
                      </div>
                      @if (orden.unidad_solicitada === 'canastillas') {
                        <div class="text-[11px] font-medium text-slate-500">
                          {{ orden.cantidad_canastillas_solicitadas | number: '1.0-2' }} canastillas
                        </div>
                      }
                    </td>
                    <td class="whitespace-nowrap">
                      <app-etiqueta-estado [estado]="orden.estado" [texto]="orden.estado_etiqueta" />
                    </td>
                    <td class="text-right whitespace-nowrap">
                      <a
                        [routerLink]="['/ordenes', orden.id]"
                        class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-300 hover:bg-slate-50 hover:text-marca-700 transition"
                      >
                        <span>Ver</span>
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </app-tarjeta>
    </div>
  `,
})
export class OrdenesListaPage {
  private readonly servicio = inject(OrdenesService);
  protected readonly auth = inject(AuthService);

  protected readonly filtros: { valor: EstadoOrden | 'todas'; texto: string }[] = [
    { valor: 'todas', texto: 'Todas' },
    { valor: 'pendiente', texto: 'Pendientes' },
    { valor: 'en_produccion', texto: 'En Producción' },
    { valor: 'finalizada', texto: 'Finalizadas' },
    { valor: 'cancelada', texto: 'Canceladas' },
  ];

  protected readonly filtro = signal<EstadoOrden | 'todas'>('todas');
  protected readonly cargando = signal(true);
  private readonly todas = signal<Orden[]>([]);

  protected readonly ordenes = computed(() => this.todas());

  constructor() {
    this.cargar();
  }

  protected cambiarFiltro(valor: EstadoOrden | 'todas'): void {
    this.filtro.set(valor);
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    const filtro = this.filtro();
    this.servicio.listar(filtro === 'todas' ? {} : { estado: filtro }).subscribe({
      next: (ordenes) => {
        this.todas.set(ordenes);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }
}

