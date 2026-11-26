import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import type {
  Horno,
  HornoGuardar,
  ItemCatalogo,
  Linea,
  TipoAceite,
} from '../../core/modelos/catalogos.model';
import { AuthService } from '../../core/servicios/auth.service';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { ConfirmarComponent } from '../../ui/confirmar.component';
import { IconoComponent } from '../../ui/icono.component';

/**
 * Hornos: categorías que produce, exportación y calibración de tanque de aceite.
 */
/** Capacidad en bultos/h (papa) y en kg/h (demás líneas): enteros positivos. */
const VALIDA_BULTOS = [Validators.min(1), Validators.max(9999), Validators.pattern(/^\d+$/)];
const VALIDA_KG = [Validators.min(1), Validators.max(99999), Validators.pattern(/^\d+$/)];

@Component({
  selector: 'app-hornos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconoComponent, 
    ReactiveFormsModule,
    RouterLink,
    DecimalPipe,
    BotonComponent,
    CargandoComponent,
    ConfirmarComponent,
  ],
  template: `
    <div class="pagina-contenido mx-auto max-w-6xl">
      <!-- Encabezado Espacioso -->
      <header
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5"
      >
        <div>
          <a
            [routerLink]="volverRuta()"
            class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition mb-2"
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
            {{ volverTexto() }}
          </a>
          <h1
            class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex flex-wrap items-center gap-3"
          >
            <span>Líneas y Hornos de Fritura</span>
            <span
              class="rounded-full bg-marca-100 px-3 py-0.5 text-xs font-extrabold text-marca-800 border border-slate-200"
            >
              {{ hornos().length }} hornos
            </span>
          </h1>
          <p class="mt-1 text-sm text-slate-500 font-medium">
            @if (esSupervisor()) {
              Actualiza la capacidad de bultos por hora de cada horno. La demás configuración la
              administra el Administrador.
            } @else {
              Configuración de capacidad por línea, aptitud para exportación y calibración
              geométrica de tanques.
            }
          </p>
        </div>
      </header>

      @if (esSupervisor()) {
        <div class="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
          <div class="mb-5 border-b border-slate-100 pb-4">
            <h2 class="flex items-center gap-2 text-lg font-bold text-slate-900">
              <span
                class="flex h-8 w-8 items-center justify-center rounded-xl bg-marca-100 text-sm text-marca-700"
                ><app-icono nombre="engranaje" [tamano]="20" /></span
              >
              Capacidad de producción
            </h2>
            <p class="mt-1 text-xs font-medium text-slate-500">
              Bultos de papa por hora. Se usa para repartir los bultos entre las referencias de papa
              en la proyección. La capacidad en kilos de las demás líneas la configura el
              Administrador.
            </p>
          </div>
          <form
            [formGroup]="formCapacidad"
            (ngSubmit)="guardarCapacidad()"
            class="grid gap-5 sm:grid-cols-2"
          >
            <div>
              <label class="etiqueta text-xs font-bold text-slate-700" for="horno_capacidad"
                >Horno</label
              >
              <select
                id="horno_capacidad"
                class="campo font-semibold"
                formControlName="horno_id"
                (change)="cambiarHornoCapacidad()"
              >
                <option [ngValue]="null" disabled>Selecciona un horno…</option>
                @for (horno of hornosConBodega(); track horno.id) {
                  <option [ngValue]="horno.id">{{ horno.nombre }}</option>
                }
              </select>
            </div>
            <div>
              <label class="etiqueta text-xs font-bold text-slate-700" for="capacidad_bultos_hora">
                Capacidad (bultos por hora)
              </label>
              <input
                id="capacidad_bultos_hora"
                type="number"
                inputmode="numeric"
                step="1"
                min="1"
                max="9999"
                class="campo font-mono"
                data-testid="horno-capacidad"
                placeholder="Ej. 50"
                formControlName="capacidad_bultos_hora"
              />
              <p class="ayuda">Número entero mayor a cero. No se asume ningún valor por defecto.</p>
            </div>
            <div class="sm:col-span-2">
              <app-boton
                tipo="submit"
                variante="primario"
                [cargando]="enviandoCapacidad()"
                testId="guardar-capacidad"
              >
                Guardar capacidad
              </app-boton>
            </div>
          </form>
        </div>
      } @else {
        <div class="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
          <div class="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span
                class="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 text-sm"
              >
                @if (editando()) {<app-icono nombre="lapiz" [tamano]="20" />} @else {<app-icono nombre="llama" [tamano]="20" />}
              </span>
              {{ editando() ? 'Corregir Configuración de Horno' : 'Agregar Nueva Línea / Horno' }}
            </h2>
            @if (editando()) {
              <span class="rounded-md bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                Modo Edición
              </span>
            }
          </div>

          <form [formGroup]="formulario" (ngSubmit)="guardar()" class="space-y-6">
            <!-- Fila 1: Nombre y Tipo de Aceite -->
            <div class="grid gap-6 md:grid-cols-2">
              <div>
                <label class="etiqueta text-xs font-bold text-slate-700 mb-1.5 block" for="nombre"
                  >Nombre de la Línea / Horno</label
                >
                <input
                  id="nombre"
                  type="text"
                  placeholder="Ej. Horno Continuo 1"
                  class="campo"
                  formControlName="nombre"
                />
              </div>
              <div>
                <label
                  class="etiqueta text-xs font-bold text-slate-700 mb-1.5 block"
                  for="tipo_aceite"
                  >Tipo de Aceite Utilizado</label
                >
                <input
                  id="tipo_aceite"
                  type="text"
                  class="campo"
                  formControlName="tipo_aceite"
                  placeholder="Ej. Palma Saborizado, Alto Oleico…"
                />
              </div>
              <div>
                <label
                  class="etiqueta text-xs font-bold text-slate-700 mb-1.5 block"
                  for="aceite_id"
                  >Aceite del catálogo</label
                >
                <select id="aceite_id" class="campo" formControlName="aceite_id">
                  <option [ngValue]="null">Sin asignar</option>
                  @for (aceite of aceites(); track aceite.id) {
                    <option [ngValue]="aceite.id">
                      {{ aceite.nombre }} ({{ aceite.densidad_kg_por_litro }} kg/L)
                    </option>
                  }
                </select>
              </div>
              @if (lineas().length > 0) {
                <div>
                  <label
                    class="etiqueta text-xs font-bold text-slate-700 mb-1.5 block"
                    for="linea_id"
                    >Línea de producción</label
                  >
                  <select id="linea_id" class="campo" formControlName="linea_id">
                    @for (linea of lineas(); track linea.id) {
                      <option [ngValue]="linea.id">{{ linea.nombre }}</option>
                    }
                  </select>
                  <p class="mt-1 text-xs text-slate-500 font-medium">
                    Las órdenes de este horno serán de esta línea.
                  </p>
                </div>
              }
            </div>

            <!-- Tipo de horno (V31) -->
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3
                class="text-xs font-extrabold uppercase tracking-wider text-marca-900 flex items-center gap-1.5"
              >
                <app-icono nombre="llama" [tamano]="16" /> Tipo de horno
              </h3>
              <div class="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup">
                @for (opcion of tiposHorno; track opcion.valor) {
                  <button
                    type="button"
                    role="radio"
                    [attr.aria-checked]="tipoElegido() === opcion.valor"
                    [attr.data-testid]="'horno-tipo-' + opcion.valor"
                    (click)="formulario.controls.tipo.setValue(opcion.valor)"
                    class="rounded-xl border-2 p-4 text-left transition-colors"
                    [class]="
                      tipoElegido() === opcion.valor
                        ? 'border-marca-600 bg-white shadow-sm'
                        : 'border-slate-200 bg-white/60 hover:border-marca-300'
                    "
                  >
                    <span class="block font-extrabold text-slate-900">{{ opcion.nombre }}</span>
                    <span class="mt-1 block text-xs font-medium text-slate-600">{{
                      opcion.ayuda
                    }}</span>
                  </button>
                }
              </div>
            </div>

            <!-- Capacidad productiva del horno -->
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3
                class="text-xs font-extrabold uppercase tracking-wider text-marca-900 flex items-center gap-1.5"
              >
                <app-icono nombre="engranaje" [tamano]="16" /> Capacidad de producción
              </h3>
              <div class="mt-3 grid gap-6 md:grid-cols-2">
                @if (capacidadEnKg()) {
                  <div>
                    <label
                      class="etiqueta text-xs font-bold text-slate-700 mb-1 block"
                      for="capacidad_kg_hora"
                    >
                      Kilos por hora
                    </label>
                    <div class="relative">
                      <input
                        id="capacidad_kg_hora"
                        type="number"
                        inputmode="numeric"
                        step="1"
                        min="1"
                        max="99999"
                        placeholder="Ej. 450"
                        class="campo font-mono pr-14"
                        data-testid="horno-capacidad-kg"
                        formControlName="capacidad_kg_hora"
                      />
                      <span
                        class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-500"
                        >kg/h</span
                      >
                    </div>
                  </div>
                  <p class="self-end text-xs font-medium text-marca-900">
                    Kilos de {{ materiaPrimaElegida() }} que el horno procesa en una hora. Número
                    entero mayor a cero.
                  </p>
                } @else {
                  <div>
                    <label
                      class="etiqueta text-xs font-bold text-slate-700 mb-1 block"
                      for="capacidad_bultos_hora"
                    >
                      Bultos por hora
                    </label>
                    <div class="relative">
                      <input
                        id="capacidad_bultos_hora"
                        type="number"
                        inputmode="numeric"
                        step="1"
                        min="1"
                        max="9999"
                        placeholder="Ej. 50"
                        class="campo font-mono pr-20"
                        data-testid="horno-capacidad"
                        formControlName="capacidad_bultos_hora"
                      />
                      <span
                        class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-500"
                        >bultos/h</span
                      >
                    </div>
                  </div>
                  <p class="self-end text-xs font-medium text-marca-900">
                    La papa va en bultos: con esta capacidad y la participación de cada referencia,
                    Bodega proyecta la distribución de bultos, kg crudos y kg fritos estimados.
                  </p>
                }
              </div>
            </div>

            <!-- Fila 2: Categorías Permitidas -->
            <div class="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5">
              <h3
                class="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5"
              >
                <app-icono nombre="etiqueta" [tamano]="16" /> Categorías que puede producir este horno
              </h3>
              <div class="flex flex-wrap gap-3">
                @for (categoria of categorias(); track categoria.id) {
                  <label
                    class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all select-none"
                    [class.bg-marca-500]="categoriasElegidas().includes(categoria.id)"
                    [class.text-white]="categoriasElegidas().includes(categoria.id)"
                    [class.border-marca-600]="categoriasElegidas().includes(categoria.id)"
                    [class.bg-white]="!categoriasElegidas().includes(categoria.id)"
                    [class.text-slate-700]="!categoriasElegidas().includes(categoria.id)"
                    [class.border-slate-200]="!categoriasElegidas().includes(categoria.id)"
                  >
                    <input
                      type="checkbox"
                      class="sr-only"
                      [checked]="categoriasElegidas().includes(categoria.id)"
                      (change)="alternarCategoria(categoria.id)"
                    />
                    <span>{{ categoria.nombre }}</span>
                  </label>
                }
              </div>
            </div>

            <!-- Fila 3: Calibración del Tanque (solo hornos continuos) -->
            @if (tipoElegido() === 'continuo') {
            <div class="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 space-y-4">
              <h3
                class="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
              >
                <app-icono nombre="regla" [tamano]="16" /> Calibración del Tanque de Aceite
              </h3>
              <div class="grid gap-6 md:grid-cols-2">
                <div>
                  <label
                    class="etiqueta text-xs font-bold text-slate-700 mb-1 block"
                    for="diametro"
                  >
                    Diámetro del Tanque (cm)
                  </label>
                  <input
                    id="diametro"
                    type="number"
                    inputmode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="Ej. 120.5"
                    class="campo font-mono"
                    formControlName="tanque_diametro_cm"
                  />
                  <p class="mt-1 text-xs text-slate-500 font-medium">
                    La app estima los litros por cm asumiendo un tanque cilíndrico.
                  </p>
                </div>
                <div>
                  <label
                    class="etiqueta text-xs font-bold text-slate-700 mb-1 block"
                    for="litros_cm"
                  >
                    Litros por cm (Medición Real Calibrada)
                  </label>
                  <input
                    id="litros_cm"
                    type="number"
                    inputmode="decimal"
                    step="0.0001"
                    min="0"
                    placeholder="Ej. 11.34"
                    class="campo font-mono"
                    formControlName="litros_por_cm_manual"
                  />
                  <p class="mt-1 text-xs text-slate-500 font-medium">
                    Si se especifica este valor, tiene prioridad sobre el diámetro teórico.
                  </p>
                </div>
              </div>
            </div>
            }

            <!-- Fila 4: Flags de Estado -->
            <div class="flex flex-wrap items-center gap-6 pt-1">
              <label
                class="flex items-center gap-3 text-xs font-bold text-slate-800 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  formControlName="apto_exportacion"
                  class="h-5 w-5 rounded border-slate-300 text-marca-600 focus:ring-marca-500"
                />
                <span>Apto para Exportación</span>
              </label>
              <label
                class="flex items-center gap-3 text-xs font-bold text-slate-800 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  formControlName="activo"
                  class="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Horno Activo para Producción</span>
              </label>
            </div>

            <!-- Acciones -->
            <div class="acciones-formulario">
              <app-boton tipo="submit" variante="primario" [cargando]="enviando()">
                {{ editando() ? 'Guardar Cambios' : 'Registrar Horno' }}
              </app-boton>
              @if (editando()) {
                <app-boton variante="secundario" (click)="cancelarEdicion()">Cancelar</app-boton>
              }
            </div>
          </form>
        </div>
      }

      <!-- Tabla de Hornos -->
      <div class="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div
          class="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between"
        >
          <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Listado de Hornos Configurados
          </h3>
          <span class="text-xs text-slate-500 font-medium"> Total: {{ hornos().length }} </span>
        </div>

        @if (cargando()) {
          <div class="p-8">
            <app-cargando text="Cargando hornos…" />
          </div>
        } @else {
          <div class="tabla-contenedor">
            <table class="tabla min-w-160">
              <thead>
                <tr>
                  <th class="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Horno / Línea
                  </th>
                  <th class="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Categorías
                  </th>
                  <th class="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Aceite
                  </th>
                  <th
                    class="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 font-mono text-right"
                  >
                    Litros / cm
                  </th>
                  <th
                    class="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 font-mono text-right"
                  >
                    Capacidad
                  </th>
                  <th class="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Estado
                  </th>
                  <th
                    class="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 text-right"
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (horno of hornos(); track horno.id) {
                  <tr class="hover:bg-marca-50 transition-colors">
                    <td class="py-4 px-6 font-bold text-slate-900 text-sm">
                      <div class="flex items-center gap-2">
                        <span>{{ horno.nombre }}</span>
                        @if (horno.linea && horno.linea.codigo !== 'papa') {
                          <span
                            class="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200/80"
                          >
                            {{ horno.linea.nombre }}
                          </span>
                        }
                        @if (horno.tipo === 'batch') {
                          <span
                            class="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-800 border border-violet-200/80"
                            data-testid="badge-batch"
                          >
                            Batch
                          </span>
                        }
                        @if (horno.apto_exportacion) {
                          <span
                            class="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200/80"
                          >
                            <app-icono nombre="avion" [tamano]="16" /> Exportación
                          </span>
                        }
                      </div>
                    </td>
                    <td class="py-4 px-4">
                      <div class="flex flex-wrap gap-1">
                        @for (categoria of horno.categorias; track categoria.id) {
                          <span
                            class="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700"
                          >
                            {{ categoria.nombre }}
                          </span>
                        } @empty {
                          <span class="text-xs text-slate-400 font-medium">Ninguna</span>
                        }
                      </div>
                    </td>
                    <td class="py-4 px-4 font-medium text-xs text-slate-700">
                      {{ horno.tipo_aceite || '—' }}
                    </td>
                    <td class="py-4 px-4 text-right font-mono font-bold text-xs text-slate-800">
                      @if (horno.tipo === 'batch') {
                        <span class="font-sans font-semibold text-slate-400">No aplica</span>
                      } @else if (horno.litros_por_cm !== null) {
                        {{ horno.litros_por_cm | number: '1.0-4' }} L/cm
                      } @else {
                        <span
                          class="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200"
                        >
                          <app-icono nombre="alerta" [tamano]="16" /> Sin calibrar
                        </span>
                      }
                    </td>
                    <td class="py-4 px-4 text-right font-mono font-bold text-xs text-slate-800">
                      @if (capacidadDe(horno); as capacidad) {
                        {{ capacidad.valor | number: '1.0-0' }}
                        <span class="font-sans text-slate-500">{{ capacidad.unidad }}</span>
                      } @else {
                        <span
                          class="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200"
                        >
                          <app-icono nombre="alerta" [tamano]="16" /> Sin configurar
                        </span>
                      }
                    </td>
                    <td class="py-4 px-4">
                      @if (horno.activo) {
                        <span
                          class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200/60"
                        >
                          <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                          Activo
                        </span>
                      } @else {
                        <span
                          class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 border border-slate-200"
                        >
                          <span class="h-2 w-2 rounded-full bg-slate-400"></span>
                          Inactivo
                        </span>
                      }
                    </td>
                    <td class="py-4 px-6 text-right whitespace-nowrap">
                      <div class="inline-flex items-center gap-2 justify-end">
                        @if (esSupervisor()) {
                          @if (usaBodega(horno)) {
                            <button
                              type="button"
                              class="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-bold text-marca-700 hover:bg-marca-100 hover:text-marca-900 border border-slate-200 transition-all cursor-pointer"
                              (click)="prepararCapacidad(horno)"
                            >
                              <app-icono nombre="engranaje" [tamano]="16" /> Capacidad
                            </button>
                          }
                        } @else {
                          <button
                            type="button"
                            class="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-bold text-marca-700 hover:bg-marca-100 hover:text-marca-900 border border-slate-200 transition-all cursor-pointer"
                            (click)="editar(horno)"
                          >
                            <app-icono nombre="lapiz" [tamano]="16" /> Corregir
                          </button>
                          <button
                            type="button"
                            class="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:text-rose-900 border border-rose-200/80 transition-all cursor-pointer"
                            (click)="aEliminar.set(horno)"
                          >
                            <app-icono nombre="basura" [tamano]="16" /> Eliminar
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-slate-400 font-medium">
                      No hay hornos configurados.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>

    <app-confirmar
      [abierto]="aEliminar() !== null"
      [titulo]="'¿Eliminar ' + (aEliminar()?.nombre ?? '') + '?'"
      mensaje="Solo se puede eliminar si no tiene órdenes ni muestras de densidad. Si ya tiene datos, desactívalo."
      textoConfirmar="Sí, eliminar"
      [peligroso]="true"
      (confirmado)="eliminar()"
      (cancelado)="aEliminar.set(null)"
    />
  `,
})
export class HornosPage {
  private readonly fb = inject(FormBuilder);
  private readonly catalogos = inject(CatalogosService);
  private readonly avisos = inject(NotificacionesService);
  protected readonly auth = inject(AuthService);

  protected readonly esSupervisor = computed(() => this.auth.esSupervisor());
  protected readonly volverRuta = computed(() => (this.esSupervisor() ? '/inicio' : '/catalogos'));
  protected readonly volverTexto = computed(() =>
    this.esSupervisor() ? 'Volver al inicio' : 'Volver a Catálogos Maestros',
  );
  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly enviandoCapacidad = signal(false);
  protected readonly hornos = signal<Horno[]>([]);
  protected readonly categorias = signal<ItemCatalogo[]>([]);
  protected readonly aceites = signal<TipoAceite[]>([]);
  protected readonly lineas = signal<Linea[]>([]);
  protected readonly categoriasElegidas = signal<number[]>([]);
  protected readonly editando = signal<Horno | null>(null);
  protected readonly aEliminar = signal<Horno | null>(null);

  /** Solo los hornos de papa (línea con Bodega) llevan capacidad en bultos. */
  protected readonly hornosConBodega = computed(() =>
    this.hornos().filter((horno) => this.usaBodega(horno)),
  );

  protected readonly formulario = this.fb.group({
    nombre: this.fb.nonNullable.control('', Validators.required),
    tipo_aceite: this.fb.control<string | null>(null),
    aceite_id: this.fb.control<number | null>(null),
    linea_id: this.fb.control<number | null>(null),
    tanque_diametro_cm: this.fb.control<number | null>(null),
    litros_por_cm_manual: this.fb.control<number | null>(null),
    capacidad_bultos_hora: this.fb.control<number | null>(null, VALIDA_BULTOS),
    capacidad_kg_hora: this.fb.control<number | null>(null, VALIDA_KG),
    apto_exportacion: this.fb.nonNullable.control(false),
    activo: this.fb.nonNullable.control(true),
    tipo: this.fb.nonNullable.control<'continuo' | 'batch'>('continuo'),
  });

  protected readonly tiposHorno = [
    {
      valor: 'continuo' as const,
      nombre: 'Continuo',
      ayuda: 'Una tanda por hora. El aceite se mide por nivel del tanque (cm).',
    },
    {
      valor: 'batch' as const,
      nombre: 'Batch u horneado',
      ayuda: 'Un registro por orden con los baches. El aceite, por litros agregados (pistola o canecas).',
    },
  ];
  protected readonly tipoElegido = toSignal(this.formulario.controls.tipo.valueChanges, {
    initialValue: 'continuo' as 'continuo' | 'batch',
  });

  protected readonly formCapacidad = this.fb.group({
    horno_id: this.fb.control<number | null>(null, Validators.required),
    capacidad_bultos_hora: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(9999),
      Validators.pattern(/^\d+$/),
    ]),
  });

  private readonly lineaIdElegida = toSignal(this.formulario.controls.linea_id.valueChanges, {
    initialValue: null,
  });

  private readonly lineaElegida = computed(() =>
    this.lineas().find((linea) => linea.id === this.lineaIdElegida()),
  );

  /** La papa (línea con Bodega) va en bultos/h; las demás líneas en kg/h. */
  protected readonly capacidadEnKg = computed(() => {
    const linea = this.lineaElegida();
    return linea !== undefined && !linea.usa_bodega;
  });

  protected readonly materiaPrimaElegida = computed(
    () => this.lineaElegida()?.nombre_materia_prima ?? 'materia prima',
  );

  constructor() {
    // Poka-yoke: solo se exige la capacidad en la unidad de la línea elegida.
    effect(() => {
      const enKg = this.capacidadEnKg();
      const { capacidad_bultos_hora: bultos, capacidad_kg_hora: kg } = this.formulario.controls;
      const requerido = [Validators.required];
      bultos.setValidators([...(enKg ? [] : requerido), ...VALIDA_BULTOS]);
      kg.setValidators([...(enKg ? requerido : []), ...VALIDA_KG]);
      bultos.updateValueAndValidity({ emitEvent: false });
      kg.updateValueAndValidity({ emitEvent: false });
    });
    this.cargar();
  }

  /** Horno sin línea conocida (API vieja) se trata como papa. */
  protected usaBodega(horno: Horno): boolean {
    return horno.linea?.usa_bodega ?? true;
  }

  protected capacidadDe(horno: Horno): { valor: number; unidad: string } | null {
    if (this.usaBodega(horno)) {
      return horno.capacidad_bultos_hora === null
        ? null
        : { valor: Number(horno.capacidad_bultos_hora), unidad: 'bultos/h' };
    }
    return horno.capacidad_kg_hora == null
      ? null
      : { valor: Number(horno.capacidad_kg_hora), unidad: 'kg/h' };
  }

  private cargar(): void {
    this.cargando.set(true);
    forkJoin({
      hornos: this.catalogos.listarHornos(),
      categorias: this.catalogos.listarCategorias(),
      // El catálogo de aceites es opcional: si falla, el formulario sigue.
      aceites: this.catalogos.listarAceites().pipe(catchError(() => of([] as TipoAceite[]))),
      lineas: this.catalogos.listarLineas().pipe(catchError(() => of([] as Linea[]))),
    }).subscribe({
      next: ({ hornos, categorias, aceites, lineas }) => {
        this.hornos.set(hornos);
        this.categorias.set(categorias);
        this.aceites.set(aceites);
        this.lineas.set(lineas);
        if (!this.editando() && this.formulario.controls.linea_id.value === null) {
          this.formulario.controls.linea_id.setValue(this.lineaPorDefecto());
        }
        const deBodega = hornos.filter((horno) => this.usaBodega(horno));
        if (this.esSupervisor() && deBodega.length > 0) {
          const primero = deBodega[0];
          this.formCapacidad.setValue({
            horno_id: primero.id,
            capacidad_bultos_hora:
              primero.capacidad_bultos_hora === null ? null : Number(primero.capacidad_bultos_hora),
          });
        }
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected alternarCategoria(id: number): void {
    this.categoriasElegidas.update((elegidas) =>
      elegidas.includes(id) ? elegidas.filter((valor) => valor !== id) : [...elegidas, id],
    );
  }

  protected editar(horno: Horno): void {
    this.editando.set(horno);
    this.categoriasElegidas.set(horno.categorias.map((categoria) => categoria.id));
    this.formulario.setValue({
      nombre: horno.nombre,
      tipo_aceite: horno.tipo_aceite,
      aceite_id: horno.aceite?.id ?? null,
      linea_id: horno.linea?.id ?? null,
      tanque_diametro_cm: horno.tanque_diametro_cm ? Number(horno.tanque_diametro_cm) : null,
      litros_por_cm_manual: horno.litros_por_cm_manual ? Number(horno.litros_por_cm_manual) : null,
      capacidad_bultos_hora:
        horno.capacidad_bultos_hora === null ? null : Number(horno.capacidad_bultos_hora),
      capacidad_kg_hora: horno.capacidad_kg_hora == null ? null : Number(horno.capacidad_kg_hora),
      apto_exportacion: horno.apto_exportacion,
      activo: horno.activo,
      tipo: horno.tipo ?? 'continuo',
    });
  }

  protected cancelarEdicion(): void {
    this.editando.set(null);
    this.categoriasElegidas.set([]);
    this.formulario.reset({
      nombre: '',
      capacidad_bultos_hora: null,
      capacidad_kg_hora: null,
      apto_exportacion: false,
      activo: true,
      tipo: 'continuo',
      linea_id: this.lineaPorDefecto(),
    });
  }

  /** Un horno nuevo es de papa salvo que se elija otra línea. */
  private lineaPorDefecto(): number | null {
    return this.lineas().find((l) => l.codigo === 'papa')?.id ?? null;
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const enKg = this.capacidadEnKg();
    const datos: HornoGuardar = {
      nombre: valores.nombre,
      activo: valores.activo,
      tipo_aceite: valores.tipo_aceite || null,
      aceite_id: valores.aceite_id ?? null,
      // Sin línea elegida no se envía: la API conserva la del horno (o papa).
      ...(valores.linea_id ? { linea_id: valores.linea_id } : {}),
      apto_exportacion: valores.apto_exportacion,
      tipo: valores.tipo,
      tanque_diametro_cm: valores.tanque_diametro_cm ? Number(valores.tanque_diametro_cm) : null,
      litros_por_cm_manual: valores.litros_por_cm_manual
        ? Number(valores.litros_por_cm_manual)
        : null,
      // Solo viaja la capacidad en la unidad de la línea; la otra va vacía.
      capacidad_bultos_hora:
        enKg || valores.capacidad_bultos_hora === null
          ? null
          : Number(valores.capacidad_bultos_hora),
      capacidad_kg_hora:
        enKg && valores.capacidad_kg_hora !== null ? Number(valores.capacidad_kg_hora) : null,
      categoria_ids: this.categoriasElegidas(),
    };

    const editando = this.editando();
    this.enviando.set(true);
    const peticion = editando
      ? this.catalogos.actualizarHorno(editando.id, datos)
      : this.catalogos.crearHorno(datos);

    peticion.subscribe({
      next: () => {
        this.enviando.set(false);
        this.avisos.exito(editando ? 'Horno actualizado.' : 'Horno agregado.');
        this.cancelarEdicion();
        this.cargar();
      },
      error: () => this.enviando.set(false),
    });
  }

  protected cambiarHornoCapacidad(): void {
    const id = this.formCapacidad.controls.horno_id.value;
    const horno = this.hornos().find((h) => h.id === id);
    this.formCapacidad.controls.capacidad_bultos_hora.setValue(
      horno?.capacidad_bultos_hora == null ? null : Number(horno.capacidad_bultos_hora),
    );
  }

  protected prepararCapacidad(horno: Horno): void {
    this.formCapacidad.setValue({
      horno_id: horno.id,
      capacidad_bultos_hora:
        horno.capacidad_bultos_hora === null ? null : Number(horno.capacidad_bultos_hora),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected guardarCapacidad(): void {
    if (this.formCapacidad.invalid) {
      this.formCapacidad.markAllAsTouched();
      return;
    }
    const valores = this.formCapacidad.getRawValue();
    if (valores.horno_id === null || valores.capacidad_bultos_hora === null) return;

    this.enviandoCapacidad.set(true);
    this.catalogos
      .actualizarCapacidadHorno(valores.horno_id, {
        capacidad_bultos_hora: Number(valores.capacidad_bultos_hora),
      })
      .subscribe({
        next: () => {
          this.enviandoCapacidad.set(false);
          this.avisos.exito('Capacidad del horno actualizada.');
          this.cargar();
        },
        error: () => this.enviandoCapacidad.set(false),
      });
  }

  protected eliminar(): void {
    const horno = this.aEliminar();
    this.aEliminar.set(null);
    if (!horno) {
      return;
    }
    this.catalogos.eliminarHorno(horno.id).subscribe(() => {
      this.avisos.exito(`"${horno.nombre}" eliminado.`);
      this.cargar();
    });
  }
}
