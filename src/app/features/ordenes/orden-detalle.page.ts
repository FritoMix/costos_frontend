import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import type { DetalleOrden } from '../../core/modelos/produccion.model';
import { AuthService } from '../../core/servicios/auth.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { OrdenesService } from '../../core/servicios/ordenes.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { ConfirmarComponent } from '../../ui/confirmar.component';
import { EtiquetaEstadoComponent } from '../../ui/etiqueta-estado.component';
import { TarjetaComponent } from '../../ui/tarjeta.component';

type TabDetalle = 'resumen' | 'horno' | 'saborizado';

/**
 * Detalle de una orden con navegación por pestañas, diseño espacioso,
 * balance de masa, métricas clave y tablas operativas legibles.
 */
@Component({
  selector: 'app-orden-detalle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    TarjetaComponent,
    BotonComponent,
    CargandoComponent,
    ConfirmarComponent,
    EtiquetaEstadoComponent,
  ],
  template: `
    @if (cargando()) {
      <app-cargando texto="Cargando expediente de la orden…" />
    } @else if (detalle(); as datos) {
      <div class="space-y-8 max-w-7xl mx-auto">
        <!-- Encabezado Principal Despejado -->
        <header class="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-4 border-b border-slate-200/80">
          <div>
            <!-- El operario no tiene acceso al listado de órdenes: se le
                 devuelve a su propia pantalla de trabajo. -->
            <a
              [routerLink]="rutaVolver()"
              class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition mb-2"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              {{ textoVolver() }}
            </a>
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 font-mono">
                #{{ datos.orden.numero_orden }}
              </h1>
              <app-etiqueta-estado
                [estado]="datos.orden.estado"
                [texto]="datos.orden.estado_etiqueta"
              />
              @if (datos.orden.destino === 'exportacion') {
                <span class="rounded-xl bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 border border-sky-200">
                  ✈️ Lote de Exportación
                </span>
              }
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600 font-medium">
              <span class="font-bold text-slate-900">{{ datos.orden.producto.nombre_comercial }}</span>
              <span class="text-slate-300">·</span>
              <span class="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700 border border-slate-200/60">{{ datos.orden.categoria.nombre }}</span>
              <span class="text-slate-300">·</span>
              <span class="font-bold text-marca-700 bg-marca-50 px-2 py-0.5 rounded-md border border-marca-200/60 text-xs">{{ datos.orden.horno.nombre }}</span>
            </div>
          </div>

          <!-- Barra de Acciones de Estado -->
          @if (puedeGestionar() || puedeIniciar()) {
            <div class="flex flex-wrap items-center gap-2.5">
              <!-- Tomar la orden y arrancar: también lo hace el operario que
                   va a trabajarla, sin esperar al supervisor. -->
              @if (datos.orden.estado === 'pendiente' && puedeIniciar()) {
                <app-boton variante="primario" (click)="iniciar()">
                  <span class="flex items-center gap-2">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>
                    {{ auth.esOperarioHorno() || auth.esOperarioSaborizado() ? 'Tomar e Iniciar Producción' : 'Iniciar Producción' }}
                  </span>
                </app-boton>
              }
              @if (datos.orden.estado === 'en_produccion' && puedeGestionar()) {
                <app-boton variante="acento" (click)="finalizar()">
                  <span class="flex items-center gap-2">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" /></svg>
                    Finalizar Orden
                  </span>
                </app-boton>
              }
              @if (puedeGestionar() && (datos.orden.estado === 'pendiente' || datos.orden.estado === 'en_produccion')) {
                <a [routerLink]="['/ordenes', datos.orden.id, 'editar']">
                  <app-boton variante="secundario">
                    <span class="flex items-center gap-1.5">
                      <svg class="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                      Editar
                    </span>
                  </app-boton>
                </a>
                <app-boton variante="secundario" (click)="confirmacion.set('cancelar')">
                  Cancelar
                </app-boton>
              }
              @if (auth.esAdmin()) {
                <app-boton variante="peligro" (click)="confirmacion.set('eliminar')">
                  Eliminar
                </app-boton>
              }
            </div>
          }
        </header>

        <!-- Hoja de pedido: en lenguaje claro, qué se debe producir -->
        <section class="overflow-hidden rounded-3xl border border-marca-200/70 bg-gradient-to-br from-marca-50 via-white to-white shadow-sm">
          <div class="px-6 py-7 sm:px-9">
            <div class="flex items-center gap-2">
              <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-marca-600 text-white text-sm">📋</span>
              <p class="text-[11px] font-extrabold uppercase tracking-widest text-marca-600">Qué se debe producir</p>
            </div>
            <h2 class="mt-3 text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-snug text-balance">
              Producir
              @if (datos.orden.unidad_solicitada === 'canastillas') {
                <span class="text-marca-700">{{ datos.orden.cantidad_canastillas_solicitadas | number: '1.0-0' }} canastillas</span>
              } @else {
                <span class="text-marca-700">{{ datos.orden.cantidad_programada | number: '1.0-2' }} kg</span>
              }
              de <span class="text-slate-900">{{ datos.orden.producto.nombre_comercial }}</span>
            </h2>
            <p class="mt-2 text-sm font-medium text-slate-500">
              Categoría {{ datos.orden.categoria.nombre }} · Destino {{ datos.orden.destino_etiqueta }}
              @if (datos.orden.unidad_solicitada === 'canastillas') {
                · equivale a ≈ {{ datos.orden.cantidad_programada | number: '1.0-0' }} kg
              }
            </p>
          </div>

          <!-- Datos clave en celdas legibles -->
          <!-- 5 datos: en pantalla grande van en una fila; en móvil se
               reparten de a dos y el supervisor ocupa el ancho completo,
               así nunca queda una celda descolgada. -->
          <div class="grid grid-cols-2 gap-px border-t border-marca-200/50 bg-marca-200/40 lg:grid-cols-5">
            <div class="bg-white/90 px-5 py-4">
              <p class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span aria-hidden="true">📦</span> Cantidad pedida
              </p>
              <p class="mt-1 text-base font-extrabold text-slate-900">
                @if (datos.orden.unidad_solicitada === 'canastillas') {
                  {{ datos.orden.cantidad_canastillas_solicitadas | number: '1.0-0' }} canastillas
                } @else {
                  {{ datos.orden.cantidad_programada | number: '1.0-2' }} kg
                }
              </p>
            </div>
            <div class="bg-white/90 px-5 py-4">
              <p class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span aria-hidden="true">⏱️</span> Duración programada
              </p>
              <p class="mt-1 text-base font-extrabold text-slate-900">
                @if (datos.orden.horas_produccion) {
                  {{ datos.orden.horas_produccion }} {{ datos.orden.horas_produccion === 1 ? 'hora' : 'horas' }}
                } @else {
                  <span class="text-slate-400">Sin definir</span>
                }
              </p>
            </div>
            <div class="bg-white/90 px-5 py-4">
              <p class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span aria-hidden="true">🔥</span> Horno asignado
              </p>
              <p class="mt-1 text-base font-extrabold text-slate-900">{{ datos.orden.horno.nombre }}</p>
            </div>
            <div class="bg-white/90 px-5 py-4">
              <p class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span aria-hidden="true">🕒</span> Turno
              </p>
              <p class="mt-1 truncate text-base font-extrabold text-slate-900">{{ datos.orden.turno.nombre }}</p>
            </div>
            <div class="col-span-2 bg-white/90 px-5 py-4 lg:col-span-1">
              <p class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span aria-hidden="true">👤</span> Supervisor
              </p>
              <p class="mt-1 truncate text-base font-extrabold text-slate-900">{{ datos.orden.supervisor.nombre_completo }}</p>
            </div>
          </div>
        </section>

        <!-- Avance del pedido -->
        <section class="space-y-4">
          <!-- Barra de Progreso Visual -->
          @if (datos.totales.avance_porcentaje !== null) {
            <div class="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-xs space-y-2">
              <div class="flex items-center justify-between text-xs font-bold text-slate-700">
                <span class="flex items-center gap-2">
                  <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Cumplimiento del Pedido
                </span>
                <span class="font-mono text-emerald-700 text-sm">
                  {{ datos.totales.kg_papa_frita | number: '1.0-2' }} / {{ datos.orden.cantidad_programada | number: '1.0-2' }} kg ({{ datos.totales.avance_porcentaje | number: '1.0-1' }}%)
                </span>
              </div>
              <div class="h-3 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200/60 p-0.5">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                  [style.width.%]="porcentajeBarra(datos.totales.avance_porcentaje)"
                ></div>
              </div>
            </div>
          }
        </section>

        <!-- Selector de Pestañas Ergonómico -->
        <nav class="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-2 border border-slate-200/80 shadow-xs">
          <button
            type="button"
            (click)="tabActiva.set('resumen')"
            class="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-150"
            [class]="tabActiva() === 'resumen' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
            Ficha & Resumen Operativo
          </button>

          <button
            type="button"
            (click)="tabActiva.set('horno')"
            class="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-150"
            [class]="tabActiva() === 'horno' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /></svg>
            Tandas de Horno
            <span
              class="rounded-full px-2 py-0.5 text-xs font-mono font-bold"
              [class]="tabActiva() === 'horno' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'"
            >
              {{ datos.registros_horno.length }}
            </span>
          </button>

          <button
            type="button"
            (click)="tabActiva.set('saborizado')"
            class="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-150"
            [class]="tabActiva() === 'saborizado' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-16.5-.52l-.54.075A2.25 2.25 0 003 7.27v7.46c0 1.096.786 2.03 1.875 2.18m14.25-11.94c.36.052.716.11 1.07.175A2.25 2.25 0 0122 7.27v7.46c0 1.096-.786 2.03-1.875 2.18" /></svg>
            Recepciones Saborizado
            <span
              class="rounded-full px-2 py-0.5 text-xs font-mono font-bold"
              [class]="tabActiva() === 'saborizado' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'"
            >
              {{ datos.recepciones.length }}
            </span>
          </button>
        </nav>

        <!-- Contenido de Pestaña 1: Ficha & Resumen -->
        @if (tabActiva() === 'resumen') {
          <div class="grid gap-6 lg:grid-cols-3">
            <!-- Ficha Técnica (2 Columnas) -->
            <div class="lg:col-span-2 space-y-6">
              <app-tarjeta
                titulo="Ficha Técnica de Programación"
                subtitulo="Parámetros maestros y especificaciones del lote"
              >
                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="rounded-xl bg-slate-50/80 p-4 border border-slate-200/70">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block">Fecha Programada</span>
                    <span class="mt-1 font-mono font-bold text-slate-900 text-base block">{{ datos.orden.fecha | date: 'EEEE, d MMMM yyyy' }}</span>
                  </div>

                  <div class="rounded-xl bg-slate-50/80 p-4 border border-slate-200/70">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block">Turno Operativo</span>
                    <span class="mt-1 font-bold text-slate-900 text-base block">{{ datos.orden.turno.nombre }}</span>
                  </div>

                  <div class="rounded-xl bg-slate-50/80 p-4 border border-slate-200/70">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block">Supervisor a Cargo</span>
                    <span class="mt-1 font-bold text-slate-900 text-base block">{{ datos.orden.supervisor.nombre_completo }}</span>
                  </div>

                  <div class="rounded-xl bg-slate-50/80 p-4 border border-slate-200/70">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block">Cantidad Solicitada</span>
                    <div class="mt-1 font-mono font-bold text-slate-900 text-base">
                      @if (datos.orden.unidad_solicitada === 'canastillas') {
                        {{ datos.orden.cantidad_canastillas_solicitadas | number: '1.0-2' }} canastillas
                        <span class="text-xs text-slate-500 font-sans font-normal block mt-0.5">({{ datos.orden.cantidad_programada | number: '1.0-2' }} kg estimados)</span>
                      } @else {
                        {{ datos.orden.cantidad_programada | number: '1.0-2' }} kg
                      }
                    </div>
                  </div>

                  <div class="rounded-xl bg-slate-50/80 p-4 border border-slate-200/70">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block">Inicio de Producción</span>
                    <span class="mt-1 font-mono font-bold text-slate-900 text-sm block">
                      {{ datos.orden.hora_inicio ? (datos.orden.hora_inicio | date: 'dd/MM/yyyy HH:mm') : 'Pendiente de inicio' }}
                    </span>
                  </div>

                  <div class="rounded-xl bg-slate-50/80 p-4 border border-slate-200/70">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block">Cierre de Producción</span>
                    <span class="mt-1 font-mono font-bold text-slate-900 text-sm block">
                      {{ datos.orden.hora_fin ? (datos.orden.hora_fin | date: 'dd/MM/yyyy HH:mm') : 'En ejecución' }}
                    </span>
                  </div>
                </div>
              </app-tarjeta>
            </div>

            <!-- Balance de Masa y Mermas (1 Columna) -->
            <div class="space-y-6">
              <app-tarjeta
                titulo="Balance de Masa"
                subtitulo="Consolidado de consumos y mermas"
              >
                <div class="space-y-4">
                  <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span class="text-xs font-bold text-slate-600 uppercase tracking-wider">Bultos Crudos</span>
                    <span class="font-mono font-bold text-slate-900 text-sm">{{ datos.totales.cantidad_bultos | number: '1.0-2' }} bultos</span>
                  </div>

                  <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span class="text-xs font-bold text-slate-600 uppercase tracking-wider">Aceite Consumido</span>
                    <span class="font-mono font-bold text-amber-700 text-sm">
                      {{ datos.totales.kg_aceite > 0 ? (datos.totales.kg_aceite | number: '1.0-2') + ' kg' : '—' }}
                    </span>
                  </div>

                  <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span class="text-xs font-bold text-slate-600 uppercase tracking-wider">Desperdicio Total</span>
                    <span class="font-mono font-bold text-rose-700 text-sm">
                      {{ datos.totales.kg_desperdicio > 0 ? (datos.totales.kg_desperdicio | number: '1.0-2') + ' kg' : '0.00 kg' }}
                    </span>
                  </div>

                  <div class="pt-2">
                    <div class="rounded-xl bg-emerald-50 p-4 border border-emerald-200/60">
                      <span class="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Rendimiento Estimado</span>
                      <div class="mt-1 flex items-baseline justify-between">
                        <span class="text-2xl font-extrabold font-mono text-emerald-900">
                          {{ calcularRendimiento(datos) }}
                        </span>
                        <span class="text-xs font-semibold text-emerald-700">Kg Frita / Kg Cruda</span>
                      </div>
                    </div>
                  </div>
                </div>
              </app-tarjeta>
            </div>
          </div>
        }

        <!-- Contenido de Pestaña 2: Tandas de Horno -->
        @if (tabActiva() === 'horno') {
          <div class="space-y-6">
            <app-tarjeta
              titulo="Registro de Tandas de Fritura"
              [subtitulo]="'Estación de Horno · ' + datos.registros_horno.length + ' tanda(s) registradas'"
              [sinRelleno]="true"
            >
              @if (datos.registros_horno.length === 0) {
                <div class="px-6 py-16 text-center">
                  <div class="mx-auto h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200 mb-3">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /></svg>
                  </div>
                  <h3 class="text-base font-bold text-slate-900">Sin tandas registradas</h3>
                  <p class="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                    El operario de horno aún no ha ingresado pesajes ni consumos de aceite para esta orden.
                  </p>
                </div>
              } @else {
                <div class="overflow-x-auto">
                  <table class="tabla min-w-full">
                    <thead>
                      <tr>
                        <th class="min-w-[120px]">Horario</th>
                        <th class="min-w-[100px]">Bultos</th>
                        <th class="min-w-[120px]">Kg Crudos</th>
                        <th class="min-w-[130px]">Aceite Consumido</th>
                        <th class="min-w-[100px]">Temp. Aceite</th>
                        <th class="min-w-[180px]">Desperdicios</th>
                        <th class="min-w-[160px]">Operario</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (registro of datos.registros_horno; track registro.id) {
                        <tr class="hover:bg-slate-50/80 transition-colors">
                          <td class="whitespace-nowrap">
                            <span class="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              {{ registro.hora_inicio | date: 'HH:mm' }} – {{ registro.hora_fin | date: 'HH:mm' }}
                            </span>
                          </td>
                          <td class="tabular-nums font-mono text-sm font-semibold text-slate-800">
                            {{ registro.cantidad_bultos | number: '1.0-2' }} bto
                          </td>
                          <td class="tabular-nums font-mono font-bold text-sm text-slate-900">
                            {{ registro.kg_crudos_calculados | number: '1.0-2' }} kg
                          </td>
                          <td class="tabular-nums font-mono text-sm text-amber-800">
                            @if (registro.kg_aceite_consumido !== null) {
                              {{ registro.kg_aceite_consumido | number: '1.0-2' }} kg
                            } @else {
                              <span class="text-slate-400 font-sans text-xs italic">Falta calibración</span>
                            }
                          </td>
                          <td class="tabular-nums font-mono text-sm text-slate-700">
                            {{ registro.temperatura_aceite_c ? (registro.temperatura_aceite_c | number: '1.0-1') + ' °C' : '—' }}
                          </td>
                          <td class="text-xs">
                            @if (registro.desperdicios.length) {
                              <div class="flex flex-wrap gap-1.5">
                                @for (desperdicio of registro.desperdicios; track desperdicio.id) {
                                  <span class="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md border border-rose-200/80 font-mono text-xs font-semibold">
                                    {{ desperdicio.tipo_desperdicio.nombre }}: {{ desperdicio.cantidad_kg | number: '1.0-2' }} kg
                                  </span>
                                }
                              </div>
                            } @else {
                              <span class="text-slate-400">—</span>
                            }
                          </td>
                          <td class="whitespace-nowrap text-xs font-semibold text-slate-700">
                            {{ registro.usuario.nombre_completo }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </app-tarjeta>
          </div>
        }

        <!-- Contenido de Pestaña 3: Recepciones de Saborizado -->
        @if (tabActiva() === 'saborizado') {
          <div class="space-y-6">
            <app-tarjeta
              titulo="Recepciones en Estación de Saborizado"
              [subtitulo]="'Pesajes reales de producto terminado · ' + datos.recepciones.length + ' recepción(es)'"
              [sinRelleno]="true"
            >
              @if (datos.recepciones.length === 0) {
                <div class="px-6 py-16 text-center">
                  <div class="mx-auto h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200 mb-3">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-16.5-.52l-.54.075A2.25 2.25 0 003 7.27v7.46c0 1.096.786 2.03 1.875 2.18m14.25-11.94c.36.052.716.11 1.07.175A2.25 2.25 0 0122 7.27v7.46c0 1.096-.786 2.03-1.875 2.18" /></svg>
                  </div>
                  <h3 class="text-base font-bold text-slate-900">Sin recepciones registradas</h3>
                  <p class="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                    El operario de saborizado aún no ha registrado canastillas ni sabores para esta orden.
                  </p>
                </div>
              } @else {
                <div class="overflow-x-auto">
                  <table class="tabla min-w-full">
                    <thead>
                      <tr>
                        <th class="min-w-[120px]">Horario</th>
                        <th class="min-w-[110px]">Turno</th>
                        <th class="min-w-[130px]">Sabor Aplicado</th>
                        <th class="min-w-[120px]">Sabor Usado</th>
                        <th class="min-w-[110px]">Canastillas</th>
                        <th class="min-w-[140px]">Kg Recibidos</th>
                        <th class="min-w-[160px]">Operario</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (recepcion of datos.recepciones; track recepcion.id) {
                        <tr class="hover:bg-slate-50/80 transition-colors">
                          <td class="whitespace-nowrap">
                            <span class="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              {{ recepcion.hora_inicio | date: 'HH:mm' }} – {{ recepcion.hora_fin | date: 'HH:mm' }}
                            </span>
                          </td>
                          <td class="whitespace-nowrap text-xs font-semibold text-slate-700">
                            {{ recepcion.turno.nombre }}
                          </td>
                          <td class="whitespace-nowrap">
                            <span class="font-bold text-slate-900 bg-amber-50 text-amber-900 px-2.5 py-1 rounded-md border border-amber-200/70 text-xs">
                              {{ recepcion.sabor.nombre }}
                            </span>
                          </td>
                          <td class="tabular-nums font-mono text-sm text-slate-700">
                            {{ recepcion.cantidad_sabor_kg | number: '1.0-2' }} kg
                          </td>
                          <td class="tabular-nums font-mono font-bold text-sm text-slate-800">
                            {{ recepcion.canastillas.length }} und
                          </td>
                          <td class="font-mono font-extrabold text-sm text-emerald-800 tabular-nums">
                            {{ recepcion.kg_recibidos | number: '1.0-2' }} kg
                          </td>
                          <td class="whitespace-nowrap text-xs font-semibold text-slate-700">
                            {{ recepcion.usuario.nombre_completo }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </app-tarjeta>
          </div>
        }
      </div>

      <!-- Modales de Confirmación -->
      <app-confirmar
        [abierto]="confirmacion() === 'cancelar'"
        titulo="¿Cancelar esta orden?"
        mensaje="La orden quedará marcada como Cancelada y no se le podrán registrar más datos."
        textoConfirmar="Sí, cancelar la orden"
        [peligroso]="true"
        (confirmado)="cancelar()"
        (cancelado)="confirmacion.set(null)"
      />

      <app-confirmar
        [abierto]="confirmacion() === 'eliminar'"
        titulo="¿Eliminar esta orden?"
        mensaje="La orden y todos sus registros de horno y saborizado dejarán de aparecer en listas, análisis y exportaciones. La información se conserva en la base de datos para auditoría."
        textoConfirmar="Sí, eliminar"
        [peligroso]="true"
        (confirmado)="eliminar()"
        (cancelado)="confirmacion.set(null)"
      />
    }
  `,
})
export class OrdenDetallePage {
  readonly id = input.required<string>();

  private readonly servicio = inject(OrdenesService);
  private readonly avisos = inject(NotificacionesService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected readonly cargando = signal(true);
  protected readonly detalle = signal<DetalleOrden | null>(null);
  protected readonly confirmacion = signal<'cancelar' | 'eliminar' | null>(null);
  protected readonly tabActiva = signal<TabDetalle>('resumen');

  constructor() {
    queueMicrotask(() => this.cargar());
  }

  protected puedeGestionar(): boolean {
    const datos = this.detalle();
    if (!datos) {
      return false;
    }
    return this.auth.esAdmin() || datos.orden.supervisor.id === this.auth.usuario()?.id;
  }

  /**
   * Quién puede tomar la orden y arrancar la producción.
   *
   * Además del supervisor dueño y el administrador, los operarios de horno
   * y saborizado: son quienes están en la máquina y toman la orden que van
   * a trabajar. El backend aplica exactamente la misma regla.
   */
  protected puedeIniciar(): boolean {
    if (this.auth.esOperarioHorno() || this.auth.esOperarioSaborizado()) {
      return true;
    }
    return this.puedeGestionar();
  }

  /**
   * A dónde vuelve cada rol. Los operarios no tienen acceso al listado de
   * órdenes, así que regresan a su propia pantalla de trabajo.
   */
  protected rutaVolver(): string {
    if (this.auth.esOperarioHorno()) {
      return '/horno';
    }
    if (this.auth.esOperarioSaborizado()) {
      return '/saborizado';
    }
    return '/ordenes';
  }

  protected textoVolver(): string {
    if (this.auth.esOperarioHorno()) {
      return 'Volver a registro de horno';
    }
    if (this.auth.esOperarioSaborizado()) {
      return 'Volver a saborizado';
    }
    return 'Volver al listado de órdenes';
  }

  protected porcentajeBarra(avance: number | null): number {
    if (!avance || avance <= 0) return 0;
    return Math.min(100, Math.max(0, avance));
  }

  protected calcularRendimiento(datos: DetalleOrden): string {
    const crudos = Number(datos.totales.kg_crudos) || 0;
    const frita = Number(datos.totales.kg_papa_frita) || 0;
    if (crudos <= 0 || frita <= 0) return '—';
    const rend = (frita / crudos) * 100;
    return `${rend.toFixed(2)}%`;
  }

  private cargar(): void {
    this.cargando.set(true);
    this.servicio.detalle(Number(this.id())).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected iniciar(): void {
    this.servicio.iniciar(Number(this.id())).subscribe(() => {
      this.avisos.exito('La orden pasó a En producción.');
      this.cargar();
    });
  }

  protected finalizar(): void {
    this.servicio.finalizar(Number(this.id())).subscribe(() => {
      this.avisos.exito('Orden finalizada.');
      this.cargar();
    });
  }

  protected cancelar(): void {
    this.confirmacion.set(null);
    this.servicio.cancelar(Number(this.id())).subscribe(() => {
      this.avisos.info('Orden cancelada.');
      this.cargar();
    });
  }

  protected eliminar(): void {
    this.confirmacion.set(null);
    this.servicio.eliminar(Number(this.id())).subscribe((respuesta) => {
      const extra = respuesta.registros_eliminados
        ? ` Se eliminaron también ${respuesta.registros_eliminados} registro(s) asociados.`
        : '';
      this.avisos.exito(`Orden eliminada.${extra}`);
      void this.router.navigate(['/ordenes']);
    });
  }
}

