import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import type {
  ProyeccionProduccion,
  ReferenciaPapa,
  ReferenciaPapaGuardar,
} from '../../core/modelos/bodega.model';
import type { Horno } from '../../core/modelos/catalogos.model';
import { AuthService } from '../../core/servicios/auth.service';
import { BodegaService } from '../../core/servicios/bodega.service';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { sumarParticipacion } from '../../core/utilidades/calculos-produccion';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { ConfirmarComponent } from '../../ui/confirmar.component';

/**
 * Catalogo de referencias de papa y proyeccion de produccion.
 *
 * Bodega mantiene el catalogo. Administracion y Supervision ven ademas la
 * proyeccion planificada (capacidad del horno repartida entre referencias).
 * La produccion real sigue viviendo en los registros de horno: esta pantalla
 * nunca guarda kg producidos.
 */
@Component({
  selector: 'app-bodega-referencias',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    DecimalPipe,
    BotonComponent,
    CargandoComponent,
    ConfirmarComponent,
  ],
  template: `
    <div class="mx-auto max-w-6xl space-y-8">
      <header
        class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <a
            routerLink="/inicio"
            class="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-900"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            Volver al inicio
          </a>
          <h1
            class="flex flex-wrap items-center gap-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl"
          >
            <span>Bodega de Papa</span>
            <span
              class="rounded-full border border-lime-200 bg-lime-100 px-3 py-0.5 text-xs font-extrabold text-lime-800"
            >
              {{ activas() }} activas
            </span>
          </h1>
          <p class="mt-1 max-w-2xl text-sm font-medium text-slate-500">
            Administra tipo, peso por bulto, rendimiento de fritura y participación de cada
            referencia. El operario solo consulta estos valores al registrar la tanda.
          </p>
        </div>
      </header>

      <div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <section class="lg:col-span-5">
          <div class="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs sm:p-7">
            <div class="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 class="flex items-center gap-2 text-base font-bold text-slate-900">
                <span
                  class="flex h-7 w-7 items-center justify-center rounded-lg bg-lime-100 text-xs text-lime-800"
                >
                  {{ editando() ? '✏️' : '➕' }}
                </span>
                {{ editando() ? 'Corregir referencia' : 'Nueva referencia' }}
              </h2>
              @if (editando()) {
                <span
                  class="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800"
                >
                  Modo edición
                </span>
              }
            </div>

            <form [formGroup]="formulario" (ngSubmit)="guardar()" class="space-y-5">
              <div>
                <label class="etiqueta text-xs font-bold text-slate-700" for="nombre">
                  Nombre de la referencia
                </label>
                <input
                  id="nombre"
                  type="text"
                  class="campo"
                  data-testid="bodega-nombre"
                  placeholder="Ej. Papa Criolla, Pastusa, Capiro"
                  formControlName="nombre"
                />
                <p class="ayuda">El nombre debe ser único para no confundir referencias.</p>
              </div>

              <div>
                <label class="etiqueta text-xs font-bold text-slate-700" for="tipo">
                  Tipo de papa
                </label>
                <input
                  id="tipo"
                  type="text"
                  class="campo"
                  data-testid="bodega-tipo"
                  placeholder="Ej. Papa pareja, Papa lavada"
                  formControlName="tipo"
                />
              </div>

              <div>
                <label class="etiqueta text-xs font-bold text-slate-700" for="peso">
                  Peso promedio por bulto (kg)
                </label>
                <div class="relative">
                  <input
                    id="peso"
                    type="number"
                    inputmode="decimal"
                    step="0.01"
                    min="0.01"
                    max="9999.99"
                    class="campo pr-16 font-mono"
                    data-testid="bodega-peso"
                    placeholder="Ej. 50.00"
                    formControlName="peso_promedio_bulto_kg"
                  />
                  <span
                    class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-bold text-slate-400"
                  >
                    kg / bulto
                  </span>
                </div>
                <p class="ayuda">
                  El operario verá este peso al elegir la referencia. Las tandas anteriores no se
                  recalculan.
                </p>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="etiqueta text-xs font-bold text-slate-700" for="rendimiento">
                    Rendimiento de fritura (%)
                  </label>
                  <div class="relative">
                    <input
                      id="rendimiento"
                      type="number"
                      inputmode="decimal"
                      step="0.0001"
                      min="0.0001"
                      max="100"
                      class="campo pr-10 font-mono"
                      data-testid="bodega-rendimiento"
                      placeholder="Ej. 25.00"
                      formControlName="rendimiento_fritura_pct"
                    />
                    <span
                      class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-bold text-slate-400"
                      >%</span
                    >
                  </div>
                  <p class="ayuda">Kg fritos = kg crudos × rendimiento / 100.</p>
                </div>

                <div>
                  <label class="etiqueta text-xs font-bold text-slate-700" for="participacion">
                    Participación (%)
                  </label>
                  <div class="relative">
                    <input
                      id="participacion"
                      type="number"
                      inputmode="decimal"
                      step="0.0001"
                      min="0"
                      max="100"
                      class="campo pr-10 font-mono"
                      data-testid="bodega-participacion"
                      placeholder="Ej. 33.33"
                      formControlName="porcentaje_produccion_pct"
                    />
                    <span
                      class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-bold text-slate-400"
                      >%</span
                    >
                  </div>
                  <p class="ayuda">Las referencias activas deben sumar 100 %.</p>
                </div>
              </div>

              <div class="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
                <label class="flex cursor-pointer select-none items-center justify-between">
                  <div>
                    <span class="block text-xs font-bold text-slate-800">Referencia activa</span>
                    <span class="text-[11px] font-medium text-slate-500">
                      Disponible para nuevas tandas de horno
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    formControlName="activo"
                    class="h-5 w-5 cursor-pointer rounded border-slate-300 text-marca-600 focus:ring-marca-500"
                  />
                </label>
              </div>

              <div class="flex items-center gap-3 pt-1">
                <app-boton
                  tipo="submit"
                  variante="primario"
                  [anchoCompleto]="true"
                  [cargando]="enviando()"
                  testId="guardar-referencia"
                >
                  {{ editando() ? 'Guardar cambios' : 'Registrar referencia' }}
                </app-boton>
                @if (editando()) {
                  <app-boton variante="secundario" (click)="cancelarEdicion()">Cancelar</app-boton>
                }
              </div>
            </form>
          </div>
        </section>

        <section class="lg:col-span-7">
          <div class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
            <div
              class="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4"
            >
              <h2 class="text-xs font-bold uppercase tracking-wider text-slate-700">
                Referencias registradas
              </h2>
              <span class="text-xs font-medium text-slate-500"
                >Total: {{ referencias().length }}</span
              >
            </div>

            @if (cargando()) {
              <div class="p-8">
                <app-cargando texto="Cargando referencias de papa…" />
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="tabla w-full table-fixed">
                  <colgroup>
                    <col class="w-[30%]" />
                    <col class="w-[13%]" />
                    <col class="w-[14%]" />
                    <col class="w-[15%]" />
                    <col class="w-[14%]" />
                    <col class="w-[14%]" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th
                        class="px-4 py-3.5 whitespace-normal text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-500"
                      >
                        Referencia
                      </th>
                      <th
                        class="px-2 py-3.5 text-right whitespace-normal text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-500"
                      >
                        Peso / bulto
                      </th>
                      <th
                        class="px-2 py-3.5 text-right whitespace-normal text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-500"
                      >
                        Rendimiento
                      </th>
                      <th
                        class="px-2 py-3.5 text-right whitespace-normal text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-500"
                      >
                        Participación
                      </th>
                      <th
                        class="px-2 py-3.5 whitespace-normal text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-500"
                      >
                        Estado
                      </th>
                      <th
                        class="px-3 py-3.5 text-right whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-slate-500"
                      >
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (referencia of referencias(); track referencia.id) {
                      <tr
                        class="transition-colors hover:bg-lime-50/40"
                        [attr.data-testid]="'referencia-' + referencia.id"
                      >
                        <td class="px-4 py-4">
                          <p class="text-sm font-bold text-slate-900">{{ referencia.nombre }}</p>
                          <p class="mt-0.5 text-[11px] font-semibold text-slate-500">
                            {{ referencia.tipo || 'Tipo sin configurar' }}
                          </p>
                          <p class="mt-0.5 text-[11px] font-medium text-slate-400">
                            Creada {{ referencia.fecha_creacion | date: 'dd/MM/yyyy' }}
                          </p>
                        </td>
                        <td class="px-2 py-4 text-right font-mono text-sm font-bold text-slate-800">
                          {{ referencia.peso_promedio_bulto_kg | number: '1.2-2' }} kg
                        </td>
                        <td class="px-2 py-4 text-right font-mono text-sm font-bold text-slate-800">
                          @if (referencia.rendimiento_fritura_pct !== null) {
                            {{ referencia.rendimiento_fritura_pct | number: '1.2-4' }} %
                          } @else {
                            <span
                              class="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800"
                              title="Sin configurar"
                              >Pendiente</span
                            >
                          }
                        </td>
                        <td class="px-2 py-4 text-right font-mono text-sm font-bold text-slate-800">
                          @if (referencia.porcentaje_produccion_pct !== null) {
                            {{ referencia.porcentaje_produccion_pct | number: '1.2-4' }} %
                          } @else {
                            <span
                              class="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800"
                              title="Sin configurar"
                              >Pendiente</span
                            >
                          }
                        </td>
                        <td class="px-2 py-4">
                          @if (referencia.activo) {
                            <span
                              class="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800"
                            >
                              <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                              Activa
                            </span>
                          } @else {
                            <span
                              class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500"
                            >
                              <span class="h-2 w-2 rounded-full bg-slate-400"></span>
                              Inactiva
                            </span>
                          }
                        </td>
                        <td class="whitespace-nowrap px-3 py-4 text-right">
                          <div class="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              class="inline-flex cursor-pointer items-center justify-center rounded-xl border border-lime-200/80 bg-lime-50 p-2 text-xs text-lime-800 transition-all hover:bg-lime-100 hover:text-lime-900"
                              title="Corregir referencia"
                              aria-label="Corregir referencia"
                              (click)="editar(referencia)"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              class="inline-flex cursor-pointer items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50 p-2 text-xs text-rose-700 transition-all hover:bg-rose-100 hover:text-rose-900"
                              title="Eliminar referencia"
                              aria-label="Eliminar referencia"
                              (click)="aEliminar.set(referencia)"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td
                          colspan="6"
                          class="px-6 py-12 text-center text-sm font-medium text-slate-400"
                        >
                          Todavía no hay referencias de papa. Crea la primera con el formulario.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <div
            class="mt-4 rounded-2xl border px-5 py-4 text-xs font-medium"
            [class]="
              configuracionCompleta()
                ? 'border-emerald-200/70 bg-emerald-50/60 text-emerald-900'
                : 'border-amber-200/70 bg-amber-50/60 text-amber-900'
            "
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="font-bold">Participación de referencias activas</p>
              <span class="font-mono text-sm font-black" data-testid="bodega-total-participacion">
                {{ totalParticipacion() | number: '1.2-4' }} %
              </span>
            </div>
            @if (configuracionCompleta()) {
              <p class="mt-1 leading-relaxed">
                Configuración completa. La proyección puede distribuir la capacidad del horno.
              </p>
            } @else {
              <p class="mt-1 leading-relaxed">
                La configuración está incompleta: las referencias activas deben tener tipo,
                rendimiento, participación y sumar exactamente 100 %. Mientras no se corrija, el
                sistema no permite proyectar producción. Las tandas ya registradas no cambian.
              </p>
            }
          </div>
        </section>
      </div>

      @if (puedeProyectar()) {
        <section
          class="rounded-3xl border border-sky-200/80 bg-white p-6 shadow-xs sm:p-7"
          data-testid="bodega-proyeccion"
        >
          <div
            class="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-lg font-black text-slate-900">Proyección planificada</h2>
                <span
                  class="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-extrabold text-sky-800"
                >
                  No es producción real
                </span>
              </div>
              <p class="mt-1 max-w-2xl text-sm font-medium text-slate-500">
                Distribuye la capacidad del horno entre las referencias activas. Los kg fritos son
                una estimación; la producción real se registra en Horno.
              </p>
            </div>
            <a
              [routerLink]="rutaConfigHornos()"
              class="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-sky-300 hover:text-sky-800"
            >
              Configurar hornos
            </a>
          </div>

          @if (hornos().length === 0) {
            <div
              class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-900"
            >
              No hay hornos activos. Configura un horno y su capacidad de bultos por hora.
            </div>
          } @else {
            <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label class="etiqueta text-xs font-bold text-slate-700" for="horno-proyeccion"
                  >Horno</label
                >
                <select
                  id="horno-proyeccion"
                  class="campo font-semibold"
                  [value]="hornoSeleccionadoId()"
                  (change)="cambiarHorno($any($event.target).value)"
                >
                  @for (horno of hornos(); track horno.id) {
                    <option [value]="horno.id">{{ horno.nombre }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="etiqueta text-xs font-bold text-slate-700" for="horas-proyeccion"
                  >Horas a proyectar</label
                >
                <input
                  id="horas-proyeccion"
                  type="number"
                  min="1"
                  max="24"
                  step="1"
                  class="campo font-mono"
                  [value]="horas()"
                  (change)="cambiarHoras($any($event.target).value)"
                />
              </div>
              <div class="sm:col-span-2 lg:col-span-2 flex items-end">
                <button
                  type="button"
                  class="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="cargandoProyeccion()"
                  (click)="proyectar()"
                >
                  {{ cargandoProyeccion() ? 'Calculando…' : 'Actualizar proyección' }}
                </button>
              </div>
            </div>

            @if (errorProyeccion()) {
              <div
                class="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800"
                data-testid="bodega-proyeccion-error"
              >
                {{ errorProyeccion() }}
              </div>
            }

            @if (proyeccion(); as plan) {
              <div class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500"
                    >Capacidad</span
                  >
                  <p class="mt-1 font-mono text-xl font-black text-slate-900">
                    {{ plan.capacidad_bultos_hora | number: '1.0-0' }}
                    <span class="text-xs font-semibold text-slate-500">bultos/hora</span>
                  </p>
                </div>
                <div class="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-sky-700"
                    >Total bultos</span
                  >
                  <p
                    class="mt-1 font-mono text-xl font-black text-sky-900"
                    data-testid="proyeccion-bultos"
                  >
                    {{ plan.total_bultos | number: '1.0-0' }}
                  </p>
                </div>
                <div class="rounded-2xl border border-lime-200 bg-lime-50/70 p-4">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-lime-700"
                    >Kg crudos</span
                  >
                  <p
                    class="mt-1 font-mono text-xl font-black text-lime-900"
                    data-testid="proyeccion-kg-crudos"
                  >
                    {{ plan.total_kg_crudos | number: '1.0-2' }}
                  </p>
                </div>
                <div class="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-amber-700"
                    >Kg fritos estimados</span
                  >
                  <p
                    class="mt-1 font-mono text-xl font-black text-amber-900"
                    data-testid="proyeccion-kg-fritos"
                  >
                    {{ plan.total_kg_fritos_estimados | number: '1.0-2' }}
                  </p>
                </div>
              </div>

              <div class="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
                <table class="tabla">
                  <thead class="bg-slate-50/80">
                    <tr>
                      <th
                        class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500"
                      >
                        Referencia
                      </th>
                      <th
                        class="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500"
                      >
                        Participación
                      </th>
                      <th
                        class="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500"
                      >
                        Bultos
                      </th>
                      <th
                        class="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500"
                      >
                        Kg crudos
                      </th>
                      <th
                        class="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500"
                      >
                        Rendimiento
                      </th>
                      <th
                        class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500"
                      >
                        Kg fritos est.
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (fila of plan.referencias; track fila.referencia_id) {
                      <tr>
                        <td class="px-4 py-3">
                          <p class="text-sm font-bold text-slate-900">{{ fila.nombre }}</p>
                          <p class="text-[11px] font-semibold text-slate-500">{{ fila.tipo }}</p>
                        </td>
                        <td class="px-3 py-3 text-right font-mono text-sm text-slate-700">
                          {{ fila.porcentaje_produccion_pct | number: '1.2-4' }} %
                        </td>
                        <td class="px-3 py-3 text-right font-mono text-sm font-bold text-slate-900">
                          {{ fila.bultos }}
                        </td>
                        <td class="px-3 py-3 text-right font-mono text-sm text-slate-700">
                          {{ fila.kg_crudos | number: '1.0-2' }}
                        </td>
                        <td class="px-3 py-3 text-right font-mono text-sm text-slate-700">
                          {{ fila.rendimiento_fritura_pct | number: '1.2-4' }} %
                        </td>
                        <td class="px-4 py-3 text-right font-mono text-sm font-bold text-amber-800">
                          {{ fila.kg_fritos_estimados | number: '1.0-2' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                  <tfoot class="border-t border-slate-200 bg-slate-50/80">
                    <tr>
                      <td
                        class="px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-700"
                        colspan="2"
                      >
                        Total
                      </td>
                      <td class="px-3 py-3 text-right font-mono text-sm font-black text-sky-900">
                        {{ plan.total_bultos }}
                      </td>
                      <td class="px-3 py-3 text-right font-mono text-sm font-black text-lime-900">
                        {{ plan.total_kg_crudos | number: '1.0-2' }}
                      </td>
                      <td></td>
                      <td class="px-4 py-3 text-right font-mono text-sm font-black text-amber-900">
                        {{ plan.total_kg_fritos_estimados | number: '1.0-2' }}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <p class="mt-3 text-[11px] font-medium leading-relaxed text-slate-500">
                Cálculo para {{ plan.horas }} hora(s) en {{ plan.horno_nombre }}. La distribución
                garantiza que la suma de bultos sea exactamente la capacidad. Los kg reales se
                registran en cada tanda de horno y no se reemplazan por esta proyección.
              </p>
            }
          }
        </section>
      }
    </div>

    <app-confirmar
      [abierto]="aEliminar() !== null"
      [titulo]="'¿Eliminar ' + (aEliminar()?.nombre ?? '') + '?'"
      mensaje="Solo se puede eliminar si no tiene tandas de horno registradas. Si ya se usó, desactívala para conservar el histórico."
      textoConfirmar="Sí, eliminar"
      [peligroso]="true"
      (confirmado)="eliminar()"
      (cancelado)="aEliminar.set(null)"
    />
  `,
})
export class BodegaReferenciasPage {
  private readonly fb = inject(FormBuilder);
  private readonly bodega = inject(BodegaService);
  private readonly catalogos = inject(CatalogosService);
  private readonly avisos = inject(NotificacionesService);
  protected readonly auth = inject(AuthService);

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly referencias = signal<ReferenciaPapa[]>([]);
  protected readonly hornos = signal<Horno[]>([]);
  protected readonly hornoSeleccionadoId = signal<number | null>(null);
  protected readonly horas = signal(1);
  protected readonly proyeccion = signal<ProyeccionProduccion | null>(null);
  protected readonly cargandoProyeccion = signal(false);
  protected readonly errorProyeccion = signal<string | null>(null);
  protected readonly editando = signal<ReferenciaPapa | null>(null);
  protected readonly aEliminar = signal<ReferenciaPapa | null>(null);

  protected readonly activas = computed(() => this.referencias().filter((r) => r.activo).length);
  protected readonly puedeProyectar = computed(
    () => this.auth.esAdmin() || this.auth.esSupervisor(),
  );
  protected readonly rutaConfigHornos = computed(() =>
    this.auth.esAdmin() ? '/catalogos/hornos' : '/hornos',
  );
  protected readonly hornoSeleccionado = computed(
    () => this.hornos().find((h) => h.id === this.hornoSeleccionadoId()) ?? null,
  );
  protected readonly totalParticipacion = computed(() => sumarParticipacion(this.referencias()));
  protected readonly configuracionCompleta = computed(() => {
    const activas = this.referencias().filter((r) => r.activo);
    return (
      activas.length > 0 &&
      activas.every(
        (r) =>
          !!r.tipo && r.rendimiento_fritura_pct !== null && r.porcentaje_produccion_pct !== null,
      ) &&
      Math.abs(this.totalParticipacion() - 100) <= 0.01
    );
  });

  protected readonly formulario = this.fb.group({
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
    tipo: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    peso_promedio_bulto_kg: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(9999.99),
    ]),
    rendimiento_fritura_pct: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.0001),
      Validators.max(100),
    ]),
    porcentaje_produccion_pct: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    activo: this.fb.nonNullable.control(true),
  });

  constructor() {
    this.cargar();
    if (this.puedeProyectar()) {
      this.cargarHornos();
    }
  }

  private cargar(proyectarDespues = false): void {
    this.cargando.set(true);
    this.bodega.listar(false, true).subscribe({
      next: (referencias) => {
        this.referencias.set(referencias);
        this.cargando.set(false);
        if (proyectarDespues && this.hornoSeleccionadoId()) {
          this.proyectar();
        }
      },
      error: () => this.cargando.set(false),
    });
  }

  private cargarHornos(): void {
    this.catalogos.listarHornos(true, true).subscribe({
      next: (hornos) => {
        this.hornos.set(hornos);
        const actual = this.hornos().find((h) => h.id === this.hornoSeleccionadoId());
        const conCapacidad = hornos.find((h) => h.capacidad_bultos_hora !== null);
        const elegido = actual ?? conCapacidad ?? hornos[0] ?? null;
        if (elegido) {
          this.hornoSeleccionadoId.set(elegido.id);
          this.proyectar();
        }
      },
      error: () => this.hornos.set([]),
    });
  }

  protected cambiarHorno(valor: string): void {
    const id = Number(valor);
    if (!Number.isFinite(id) || id <= 0) return;
    this.hornoSeleccionadoId.set(id);
    this.proyectar();
  }

  protected cambiarHoras(valor: string): void {
    const horas = Math.trunc(Number(valor));
    if (!Number.isFinite(horas) || horas < 1 || horas > 24) return;
    this.horas.set(horas);
    this.proyectar();
  }

  protected proyectar(): void {
    const hornoId = this.hornoSeleccionadoId();
    if (!hornoId) return;
    this.cargandoProyeccion.set(true);
    this.errorProyeccion.set(null);
    this.bodega.proyectar(hornoId, this.horas()).subscribe({
      next: (proyeccion) => {
        this.proyeccion.set(proyeccion);
        this.cargandoProyeccion.set(false);
      },
      error: (error) => {
        this.proyeccion.set(null);
        this.cargandoProyeccion.set(false);
        this.errorProyeccion.set(
          error?.error?.detail ??
            'No se pudo calcular la proyección. Revisa la configuración de hornos y referencias.',
        );
      },
    });
  }

  protected editar(referencia: ReferenciaPapa): void {
    this.editando.set(referencia);
    this.formulario.setValue({
      nombre: referencia.nombre,
      tipo: referencia.tipo ?? '',
      peso_promedio_bulto_kg: Number(referencia.peso_promedio_bulto_kg),
      rendimiento_fritura_pct:
        referencia.rendimiento_fritura_pct === null
          ? null
          : Number(referencia.rendimiento_fritura_pct),
      porcentaje_produccion_pct:
        referencia.porcentaje_produccion_pct === null
          ? null
          : Number(referencia.porcentaje_produccion_pct),
      activo: referencia.activo,
    });
  }

  protected cancelarEdicion(): void {
    this.editando.set(null);
    this.formulario.reset({
      nombre: '',
      tipo: '',
      peso_promedio_bulto_kg: null,
      rendimiento_fritura_pct: null,
      porcentaje_produccion_pct: null,
      activo: true,
    });
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const nombre = valores.nombre.trim();
    const tipo = valores.tipo.trim();
    if (!nombre || !tipo) {
      this.avisos.error('El nombre y el tipo de papa son obligatorios.');
      return;
    }

    const datos: ReferenciaPapaGuardar = {
      nombre,
      tipo,
      peso_promedio_bulto_kg: Number(valores.peso_promedio_bulto_kg),
      rendimiento_fritura_pct: Number(valores.rendimiento_fritura_pct),
      porcentaje_produccion_pct: Number(valores.porcentaje_produccion_pct),
      activo: valores.activo,
    };

    const editando = this.editando();
    this.enviando.set(true);
    const peticion = editando
      ? this.bodega.actualizar(editando.id, datos)
      : this.bodega.crear(datos);

    peticion.subscribe({
      next: () => {
        this.enviando.set(false);
        this.avisos.exito(editando ? 'Referencia actualizada.' : 'Referencia registrada.');
        this.cancelarEdicion();
        this.cargar(true);
      },
      error: () => this.enviando.set(false),
    });
  }

  protected eliminar(): void {
    const referencia = this.aEliminar();
    this.aEliminar.set(null);
    if (!referencia) {
      return;
    }

    this.bodega.eliminar(referencia.id).subscribe(() => {
      this.avisos.exito(`"${referencia.nombre}" eliminada.`);
      this.cargar(true);
    });
  }
}
