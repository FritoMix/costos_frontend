import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import type { Orden } from '../../core/modelos/produccion.model';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { OrdenesService } from '../../core/servicios/ordenes.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { EstadoVacioComponent } from '../../ui/estado-vacio.component';
import { TarjetaComponent } from '../../ui/tarjeta.component';

/**
 * Panel de operador de saborizado: Órdenes activas en producción para recepción y pesaje.
 */
@Component({
  selector: 'app-saborizado-lista',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DecimalPipe,
    TarjetaComponent,
    BotonComponent,
    CargandoComponent,
    EstadoVacioComponent,
  ],
  template: `
    <div class="space-y-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Estación de Saborizado</h1>
            <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              En Vivo
            </span>
          </div>
          <p class="mt-1 text-sm text-slate-500 font-medium">
            Selecciona la orden en proceso para registrar canastillas de producto frito recibidas y aplicación de sabor.
          </p>
        </div>
      </header>

      <!-- Órdenes pendientes: el operario las toma y arranca la producción
           sin tener que esperar a que el supervisor las inicie. -->
      @if (!cargando() && pendientes().length > 0) {
        <section class="overflow-hidden rounded-3xl border border-amber-200/80 bg-amber-50/40">
          <header class="flex items-center gap-2 border-b border-amber-200/60 px-5 py-3.5">
            <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-sm text-white">📥</span>
            <div>
              <p class="text-sm font-extrabold text-slate-900">Órdenes por tomar</p>
              <p class="text-xs font-medium text-slate-500">
                Toma la orden que vas a trabajar para arrancar la producción.
              </p>
            </div>
          </header>

          <ul class="divide-y divide-amber-200/50">
            @for (orden of pendientes(); track orden.id) {
              <li class="flex flex-wrap items-center justify-between gap-3 bg-white/70 px-5 py-4">
                <div class="min-w-0">
                  <p class="font-extrabold text-slate-900">
                    {{ orden.producto.nombre_comercial }}
                    <span class="ml-1 font-mono text-xs font-bold text-slate-500">#{{ orden.numero_orden }}</span>
                  </p>
                  <p class="mt-0.5 text-xs font-medium text-slate-500">
                    {{ orden.horno.nombre }} · {{ orden.cantidad_programada | number: '1.0-2' }} kg
                    @if (orden.horas_produccion) {
                      · {{ orden.horas_produccion }} {{ orden.horas_produccion === 1 ? 'hora' : 'horas' }}
                    }
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <a [routerLink]="['/ordenes', orden.id]" class="text-xs font-bold text-slate-500 hover:text-slate-800">
                    Ver detalle
                  </a>
                  <app-boton variante="primario" (click)="tomar(orden)" [cargando]="tomando() === orden.id">
                    Tomar e iniciar
                  </app-boton>
                </div>
              </li>
            }
          </ul>
        </section>
      }

      @if (cargando()) {
        <app-cargando texto="Consultando órdenes en producción…" />
      } @else if (ordenes().length === 0) {
        <app-tarjeta [sinRelleno]="true">
          <app-estado-vacio
            titulo="No hay órdenes en producción"
            descripcion="Cuando el supervisor inicie una orden de producción, podrás registrar las canastillas recibidas desde esta pantalla."
          />
        </app-tarjeta>
      } @else {
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          @for (orden of ordenes(); track orden.id) {
            <div class="group relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
              <div>
                <!-- Top metadata -->
                <div class="flex items-center justify-between gap-2 mb-3">
                  <span class="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-900 border border-amber-200/60">
                    <span>◍</span> {{ orden.horno.nombre }}
                  </span>
                  <span class="font-mono font-bold text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/70">
                    #{{ orden.numero_orden }}
                  </span>
                </div>

                <!-- Product info -->
                <h2 class="text-xl font-black tracking-tight text-slate-900 leading-snug">
                  {{ orden.producto.nombre_comercial }}
                </h2>
                <p class="mt-1 text-xs font-semibold text-slate-500">
                  {{ orden.categoria.nombre }}
                </p>

                <!-- Metric box -->
                <div class="mt-4 rounded-2xl bg-slate-50 p-3.5 border border-slate-200/60 flex items-center justify-between">
                  <div>
                    <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Programado</span>
                    <span class="font-mono font-extrabold text-slate-900 text-base">
                      {{ orden.cantidad_programada | number: '1.0-2' }} <span class="text-xs font-medium text-slate-500 font-sans">kg</span>
                    </span>
                  </div>
                  <div class="text-right">
                    <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Turno</span>
                    <span class="text-xs font-bold text-slate-700">
                      {{ orden.turno.nombre }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Action Button -->
              <div class="mt-5">
                <a [routerLink]="['/saborizado', orden.id]" class="block">
                  <app-boton tamano="grande" [anchoCompleto]="true" variante="primario">
                    <span class="flex items-center justify-center gap-2">
                      <span>Registrar Recepción</span>
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                    </span>
                  </app-boton>
                </a>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class SaborizadoListaPage {
  private readonly servicio = inject(OrdenesService);
  private readonly avisos = inject(NotificacionesService);

  protected readonly cargando = signal(true);
  protected readonly ordenes = signal<Orden[]>([]);
  /** Órdenes que aún nadie ha arrancado: el operario puede tomarlas. */
  protected readonly pendientes = signal<Orden[]>([]);
  /** Id de la orden que se está tomando ahora mismo (para el botón). */
  protected readonly tomando = signal<number | null>(null);

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    forkJoin({
      enProduccion: this.servicio.listar({ estado: 'en_produccion', soloPropias: false }),
      pendientes: this.servicio.listar({ estado: 'pendiente', soloPropias: false }),
    }).subscribe({
      next: ({ enProduccion, pendientes }) => {
        this.ordenes.set(enProduccion);
        this.pendientes.set(pendientes);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  /** Toma la orden y arranca la producción. */
  protected tomar(orden: Orden): void {
    this.tomando.set(orden.id);
    this.servicio.iniciar(orden.id).subscribe({
      next: () => {
        this.tomando.set(null);
        this.avisos.exito(
          'Orden ' + orden.numero_orden + ' iniciada. Ya puedes registrar recepciones.',
        );
        this.cargar();
      },
      // El mensaje de error (por ejemplo, "ese horno ya tiene una orden en
      // producción") lo muestra el interceptor.
      error: () => this.tomando.set(null),
    });
  }
}

