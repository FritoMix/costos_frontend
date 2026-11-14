import type { HttpErrorResponse } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Subscription } from 'rxjs';
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
    DatePipe,
    TarjetaComponent,
    BotonComponent,
    CargandoComponent,
    EstadoVacioComponent,
  ],
  template: `
    <div class="pagina-contenido">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Estación de Saborizado</h1>
            <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
              <span class="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
              {{ ultimaActualizacion() ? 'Actualizado ' + (ultimaActualizacion() | date: 'HH:mm:ss') : (error() ? 'Sin actualizar' : 'Consultando') }}
            </span>
          </div>
          <p class="mt-1 text-sm text-slate-500 font-medium">
            Selecciona la orden en proceso para registrar canastillas de producto frito recibidas y aplicación de sabor.
          </p>
        </div>
        <app-boton variante="secundario" (click)="cargar()" [cargando]="cargando()"
          [deshabilitado]="tomando() !== null" testId="actualizar-operaciones">Actualizar</app-boton>
      </header>
      @if (avisoOperacion()) {
        <p role="status" class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {{ avisoOperacion() }}
        </p>
      }

      <!-- Órdenes pendientes: el operario las toma y arranca la producción
           sin tener que esperar a que el supervisor las inicie. -->
      @if (!cargando() && !error() && pendientes().length > 0) {
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
                  @if (hornosOcupados().has(orden.horno.id)) {
                    <span class="text-xs font-semibold text-amber-700">Horno ocupado por otra orden.</span>
                  }
                  <app-boton variante="primario" (click)="tomar(orden)" [cargando]="tomando() === orden.id" [testId]="'tomar-orden-' + orden.id"
                    [deshabilitado]="tomando() !== null || hornosOcupados().has(orden.horno.id)">
                    Tomar e iniciar
                  </app-boton>
                  @if (orden.formula_estado === 'sin_formula') {
                    <span class="text-xs font-semibold text-amber-700">Al iniciar se buscará la fórmula activa del producto.</span>
                  }
                </div>
              </li>
            }
          </ul>
        </section>
      }

      @if (cargando()) {
        <app-cargando texto="Consultando órdenes en producción…" />
      } @else if (error()) {
        <section role="alert" class="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
          <p>{{ error() }}</p>
          <app-boton variante="secundario" (click)="cargar()">Reintentar</app-boton>
        </section>
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
            <div
              class="group relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md"
              [attr.data-testid]="'saborizado-orden-' + orden.id"
            >
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
                @if (orden.horas_produccion) {
                  <p class="mt-2 text-[11px] font-semibold text-slate-400">
                    Tope de registro: {{ orden.horas_produccion }}
                    {{ orden.horas_produccion === 1 ? 'hora' : 'horas' }} en saborizado
                  </p>
                }
              </div>

              <!-- Action Button -->
              <div class="mt-5">
                <a
                  [routerLink]="['/saborizado', orden.id]"
                  class="block"
                  [attr.data-testid]="'registrar-recepcion-' + orden.id"
                >
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
  protected readonly hornosOcupados = computed(() => new Set(this.ordenes().map(o => o.horno.id)));
  /** Órdenes que aún nadie ha arrancado: el operario puede tomarlas. */
  protected readonly pendientes = signal<Orden[]>([]);
  /** Id de la orden que se está tomando ahora mismo (para el botón). */
  protected readonly tomando = signal<number | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  private lectura?: Subscription;
  protected readonly error = signal<string | null>(null);
  protected readonly avisoOperacion = signal<string | null>(null);
  protected readonly ultimaActualizacion = signal<Date | null>(null);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    if (this.tomando() !== null) return;
    this.lectura?.unsubscribe();
    this.error.set(null);
    this.cargando.set(true);
    this.lectura = forkJoin({
      enProduccion: this.servicio.listar({ estado: 'en_produccion', soloPropias: false }),
      pendientes: this.servicio.listar({ estado: 'pendiente', soloPropias: false }),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ enProduccion, pendientes }) => {
        this.ultimaActualizacion.set(new Date());
        this.ordenes.set(enProduccion);
        this.pendientes.set(pendientes);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No se pudo cargar la lista. Revisa la conexión y vuelve a intentarlo.');
      },
    });
  }

  /** Toma la orden y arranca la producción. */
  protected tomar(orden: Orden): void {
    if (this.tomando() !== null || this.cargando()
      || this.hornosOcupados().has(orden.horno.id)) return;
    this.avisoOperacion.set(null);
    this.tomando.set(orden.id);
    this.servicio.iniciar(orden.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.tomando.set(null);
        this.avisos.exito(
          'Orden ' + orden.numero_orden + ' iniciada. Ya puedes registrar recepciones.',
        );
        this.cargar();
      },
      // El mensaje de error (por ejemplo, "ese horno ya tiene una orden en
      // producción") lo muestra el interceptor.
      error: (respuesta: HttpErrorResponse) => {
        this.tomando.set(null);
        this.avisoOperacion.set('No se confirmó el inicio. Revisa la lista antes de volver a intentarlo.');
        if ([400, 404, 409].includes(respuesta.status)) this.cargar();
      },
    });
  }
}

