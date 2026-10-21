import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import type { Horno, HornoGuardar, ItemCatalogo } from '../../core/modelos/catalogos.model';
import { AuthService } from '../../core/servicios/auth.service';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { ConfirmarComponent } from '../../ui/confirmar.component';

/**
 * Hornos: categorías que produce, exportación y calibración de tanque de aceite.
 */
@Component({
  selector: 'app-hornos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DecimalPipe,
    BotonComponent,
    CargandoComponent,
    ConfirmarComponent,
  ],
  template: `
    <div class="mx-auto max-w-6xl space-y-8">
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
            class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3"
          >
            <span>Líneas y Hornos de Fritura</span>
            <span
              class="rounded-full bg-sky-100 px-3 py-0.5 text-xs font-extrabold text-sky-800 border border-sky-200"
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
        <div class="rounded-3xl border border-sky-200/80 bg-white p-6 sm:p-8 shadow-xs">
          <div class="mb-5 border-b border-slate-100 pb-4">
            <h2 class="flex items-center gap-2 text-lg font-bold text-slate-900">
              <span
                class="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sm text-sky-700"
                >⚙️</span
              >
              Capacidad de producción
            </h2>
            <p class="mt-1 text-xs font-medium text-slate-500">
              Se usa para repartir los bultos entre las referencias de papa en la proyección.
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
                @for (horno of hornos(); track horno.id) {
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
        <div class="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
          <div class="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span
                class="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 text-sm"
              >
                {{ editando() ? '✏️' : '♨️' }}
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
            </div>

            <!-- Capacidad productiva del horno -->
            <div class="rounded-2xl border border-sky-200/80 bg-sky-50/60 p-5">
              <h3
                class="text-xs font-extrabold uppercase tracking-wider text-sky-900 flex items-center gap-1.5"
              >
                ⚙️ Capacidad de producción
              </h3>
              <div class="mt-3 grid gap-6 md:grid-cols-2">
                <div>
                  <label
                    class="etiqueta text-xs font-bold text-slate-700 mb-1 block"
                    for="capacidad_bultos_hora"
                  >
                    Bultos por hora
                  </label>
                  <input
                    id="capacidad_bultos_hora"
                    type="number"
                    inputmode="numeric"
                    step="1"
                    min="1"
                    max="9999"
                    placeholder="Ej. 50"
                    class="campo font-mono"
                    data-testid="horno-capacidad"
                    formControlName="capacidad_bultos_hora"
                  />
                </div>
                <p class="self-end text-[11px] font-medium text-sky-900">
                  Con esta capacidad y la participación de cada referencia, Bodega proyecta la
                  distribución de bultos, kg crudos y kg fritos estimados.
                </p>
              </div>
            </div>

            <!-- Fila 2: Categorías Permitidas -->
            <div class="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5">
              <h3
                class="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5"
              >
                🏷️ Categorías que puede producir este horno
              </h3>
              <div class="flex flex-wrap gap-3">
                @for (categoria of categorias(); track categoria.id) {
                  <label
                    class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all select-none"
                    [class.bg-sky-500]="categoriasElegidas().includes(categoria.id)"
                    [class.text-white]="categoriasElegidas().includes(categoria.id)"
                    [class.border-sky-600]="categoriasElegidas().includes(categoria.id)"
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

            <!-- Fila 3: Calibración del Tanque -->
            <div class="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 space-y-4">
              <h3
                class="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
              >
                📐 Calibración del Tanque de Aceite
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
                  <p class="mt-1 text-[11px] text-slate-500 font-medium">
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
                  <p class="mt-1 text-[11px] text-slate-500 font-medium">
                    Si se especifica este valor, tiene prioridad sobre el diámetro teórico.
                  </p>
                </div>
              </div>
            </div>

            <!-- Fila 4: Flags de Estado -->
            <div class="flex flex-wrap items-center gap-6 pt-1">
              <label
                class="flex items-center gap-3 text-xs font-bold text-slate-800 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  formControlName="apto_exportacion"
                  class="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
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
            <div class="flex items-center gap-3 pt-3 border-t border-slate-100">
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
      <div class="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
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
          <div class="overflow-x-auto">
            <table class="tabla">
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
                    Bultos / hora
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
                  <tr class="hover:bg-sky-50/40 transition-colors">
                    <td class="py-4 px-6 font-bold text-slate-900 text-sm">
                      <div class="flex items-center gap-2">
                        <span>{{ horno.nombre }}</span>
                        @if (horno.apto_exportacion) {
                          <span
                            class="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/80"
                          >
                            ✈️ Exportación
                          </span>
                        }
                      </div>
                    </td>
                    <td class="py-4 px-4">
                      <div class="flex flex-wrap gap-1">
                        @for (categoria of horno.categorias; track categoria.id) {
                          <span
                            class="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700"
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
                      @if (horno.litros_por_cm !== null) {
                        {{ horno.litros_por_cm | number: '1.0-4' }} L/cm
                      } @else {
                        <span
                          class="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200"
                        >
                          ⚠️ Sin calibrar
                        </span>
                      }
                    </td>
                    <td class="py-4 px-4 text-right font-mono font-bold text-xs text-slate-800">
                      @if (horno.capacidad_bultos_hora !== null) {
                        {{ horno.capacidad_bultos_hora | number: '1.0-0' }}
                      } @else {
                        <span
                          class="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200"
                        >
                          ⚠️ Sin configurar
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
                          <button
                            type="button"
                            class="inline-flex items-center gap-1 rounded-xl bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 hover:text-sky-900 border border-sky-200/80 transition-all cursor-pointer"
                            (click)="prepararCapacidad(horno)"
                          >
                            ⚙️ Capacidad
                          </button>
                        } @else {
                          <button
                            type="button"
                            class="inline-flex items-center gap-1 rounded-xl bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 hover:text-sky-900 border border-sky-200/80 transition-all cursor-pointer"
                            (click)="editar(horno)"
                          >
                            ✏️ Corregir
                          </button>
                          <button
                            type="button"
                            class="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:text-rose-900 border border-rose-200/80 transition-all cursor-pointer"
                            (click)="aEliminar.set(horno)"
                          >
                            🗑️ Eliminar
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
  protected readonly categoriasElegidas = signal<number[]>([]);
  protected readonly editando = signal<Horno | null>(null);
  protected readonly aEliminar = signal<Horno | null>(null);

  protected readonly formulario = this.fb.group({
    nombre: this.fb.nonNullable.control('', Validators.required),
    tipo_aceite: this.fb.control<string | null>(null),
    tanque_diametro_cm: this.fb.control<number | null>(null),
    litros_por_cm_manual: this.fb.control<number | null>(null),
    capacidad_bultos_hora: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(9999),
      Validators.pattern(/^\d+$/),
    ]),
    apto_exportacion: this.fb.nonNullable.control(false),
    activo: this.fb.nonNullable.control(true),
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

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    forkJoin({
      hornos: this.catalogos.listarHornos(),
      categorias: this.catalogos.listarCategorias(),
    }).subscribe({
      next: ({ hornos, categorias }) => {
        this.hornos.set(hornos);
        this.categorias.set(categorias);
        if (this.esSupervisor() && hornos.length > 0) {
          const primero = hornos[0];
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
      tanque_diametro_cm: horno.tanque_diametro_cm ? Number(horno.tanque_diametro_cm) : null,
      litros_por_cm_manual: horno.litros_por_cm_manual ? Number(horno.litros_por_cm_manual) : null,
      capacidad_bultos_hora:
        horno.capacidad_bultos_hora === null ? null : Number(horno.capacidad_bultos_hora),
      apto_exportacion: horno.apto_exportacion,
      activo: horno.activo,
    });
  }

  protected cancelarEdicion(): void {
    this.editando.set(null);
    this.categoriasElegidas.set([]);
    this.formulario.reset({
      nombre: '',
      capacidad_bultos_hora: null,
      apto_exportacion: false,
      activo: true,
    });
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const datos: HornoGuardar = {
      nombre: valores.nombre,
      activo: valores.activo,
      tipo_aceite: valores.tipo_aceite || null,
      apto_exportacion: valores.apto_exportacion,
      tanque_diametro_cm: valores.tanque_diametro_cm ? Number(valores.tanque_diametro_cm) : null,
      litros_por_cm_manual: valores.litros_por_cm_manual
        ? Number(valores.litros_por_cm_manual)
        : null,
      capacidad_bultos_hora:
        valores.capacidad_bultos_hora === null ? null : Number(valores.capacidad_bultos_hora),
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
