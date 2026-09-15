import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import type { Horno, ItemCatalogo, Producto, Turno } from '../../core/modelos/catalogos.model';
import type { OrdenGuardar } from '../../core/modelos/produccion.model';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { OrdenesService } from '../../core/servicios/ordenes.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { TarjetaComponent } from '../../ui/tarjeta.component';

/**
 * Crear o corregir una orden.
 *
 * Las mismas reglas del backend se reflejan aqui para ayudar al supervisor
 * ANTES de enviar (que hornos sirven para esta categoria, que productos
 * pertenecen a ella). La validacion de verdad la sigue haciendo la API:
 * esto es solo comodidad, no seguridad.
 */
@Component({
  selector: 'app-orden-formulario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TarjetaComponent, BotonComponent, CargandoComponent],
  template: `
    <div class="mx-auto max-w-3xl space-y-6">
      <header>
        <a routerLink="/ordenes" class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          Volver a órdenes
        </a>
        <h1 class="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          {{ id() ? 'Editar Orden de Producción' : 'Nueva Orden de Producción' }}
        </h1>
        <p class="mt-1 text-sm text-slate-500 font-medium">
          Configura los parámetros de programación, asignación de horno y meta de producción.
        </p>
      </header>

      @if (cargando()) {
        <app-cargando texto="Cargando catálogos y líneas de producción…" />
      } @else {
        <app-tarjeta>
          <form [formGroup]="formulario" (ngSubmit)="guardar()" class="space-y-6">
            <div class="grid gap-5 sm:grid-cols-2">
              <div>
                <label class="etiqueta" for="destino">Destino del Lote</label>
                <select id="destino" class="campo" formControlName="destino">
                  <option value="nacional">Nacional</option>
                  <option value="exportacion">Exportación</option>
                </select>
                @if (formulario.value.destino === 'exportacion') {
                  <p class="ayuda text-sky-700 font-semibold">ℹ️ Solo se listan los hornos calificados para exportación.</p>
                }
              </div>

              <div>
                <label class="etiqueta" for="turno">Turno Operativo</label>
                <select id="turno" class="campo" formControlName="turno_id">
                  <option [ngValue]="null" disabled>Selecciona un turno…</option>
                  @for (turno of turnos(); track turno.id) {
                    <option [ngValue]="turno.id">{{ turno.nombre }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="etiqueta" for="horas">Horas de Producción</label>
                <input
                  id="horas"
                  type="number"
                  inputmode="decimal"
                  step="1"
                  min="1"
                  class="campo"
                  formControlName="horas_produccion"
                />
                <p class="ayuda">Solo horas completas. Mínimo 1.</p>
              </div>

              <div>
                <label class="etiqueta" for="categoria">Categoría</label>
                <select id="categoria" class="campo" formControlName="categoria_id">
                  <option [ngValue]="null" disabled>Selecciona una categoría…</option>
                  @for (categoria of categorias(); track categoria.id) {
                    <option [ngValue]="categoria.id">{{ categoria.nombre }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="etiqueta" for="producto">Producto</label>
                <select id="producto" class="campo" formControlName="producto_id">
                  <option [ngValue]="null" disabled>Selecciona un producto…</option>
                  @for (producto of productosDeCategoria(); track producto.id) {
                    <option [ngValue]="producto.id">{{ producto.nombre_comercial }}</option>
                  }
                </select>
                @if (formulario.value.categoria_id && productosDeCategoria().length === 0) {
                  <p class="ayuda text-amber-700 font-semibold">
                    ⚠️ Esa categoría no tiene productos activos.
                  </p>
                }
              </div>

              <div class="sm:col-span-2">
                <label class="etiqueta" for="horno">Línea de Horno</label>
                <select id="horno" class="campo" formControlName="horno_id">
                  <option [ngValue]="null" disabled>Selecciona la línea de horno…</option>
                  @for (horno of hornosPosibles(); track horno.id) {
                    <option [ngValue]="horno.id">{{ horno.nombre }}</option>
                  }
                </select>
                @if (hornosPosibles().length === 0) {
                  <p class="ayuda text-amber-700 font-semibold">
                    ⚠️ Ningún horno activo coincide con la categoría seleccionada.
                  </p>
                }
              </div>
            </div>

            <!-- Cantidad solicitada -->
            <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-sm font-extrabold text-slate-900 uppercase tracking-wider text-xs">Unidad de Medida de la Orden</span>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <label
                  class="flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition text-sm font-bold"
                  [class]="formulario.value.unidad_solicitada === 'kg' ? 'border-marca-600 bg-marca-50/50 text-marca-900 shadow-2xs' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
                >
                  <input type="radio" formControlName="unidad_solicitada" value="kg" class="h-4 w-4 text-marca-600 focus:ring-marca-500" />
                  <span>En Kilogramos (kg)</span>
                </label>
                <label
                  class="flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition text-sm font-bold"
                  [class]="formulario.value.unidad_solicitada === 'canastillas' ? 'border-marca-600 bg-marca-50/50 text-marca-900 shadow-2xs' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
                >
                  <input type="radio" formControlName="unidad_solicitada" value="canastillas" class="h-4 w-4 text-marca-600 focus:ring-marca-500" />
                  <span>En Canastillas</span>
                </label>
              </div>

              @if (formulario.value.unidad_solicitada === 'kg') {
                <div>
                  <label class="etiqueta" for="kg">Kilos Programados</label>
                  <input
                    id="kg"
                    type="number"
                    inputmode="decimal"
                    step="0.01"
                    min="0.01"
                    class="campo bg-white"
                    placeholder="Ej. 1500.00"
                    formControlName="cantidad_kg"
                  />
                </div>
              } @else {
                <div>
                  <label class="etiqueta" for="canastillas">Número de Canastillas Solicitadas</label>
                  <input
                    id="canastillas"
                    type="number"
                    inputmode="decimal"
                    step="0.01"
                    min="0.01"
                    class="campo bg-white"
                    placeholder="Ej. 120"
                    formControlName="cantidad_canastillas"
                  />
                  <p class="ayuda">
                    Se convierten a kilos según el peso estándar parametrizado por canastilla.
                  </p>
                </div>
              }
            </div>

            <div class="flex flex-wrap items-center gap-3 pt-2">
              <app-boton tipo="submit" variante="primario" [cargando]="enviando()">
                {{ id() ? 'Guardar Cambios' : 'Crear Orden' }}
              </app-boton>
              <a routerLink="/ordenes">
                <app-boton variante="secundario">Cancelar</app-boton>
              </a>
            </div>
          </form>
        </app-tarjeta>
      }
    </div>
  `,
})
export class OrdenFormularioPage {
  /** Llega de la ruta /ordenes/:id/editar (withComponentInputBinding). */
  readonly id = input<string | undefined>();

  private readonly fb = inject(FormBuilder);
  private readonly catalogos = inject(CatalogosService);
  private readonly ordenes = inject(OrdenesService);
  private readonly avisos = inject(NotificacionesService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);

  protected readonly turnos = signal<Turno[]>([]);
  protected readonly categorias = signal<ItemCatalogo[]>([]);
  protected readonly hornos = signal<Horno[]>([]);
  protected readonly productos = signal<Producto[]>([]);

  protected readonly formulario = this.fb.group({
    destino: this.fb.nonNullable.control<'nacional' | 'exportacion'>('nacional'),
    turno_id: this.fb.control<number | null>(null, Validators.required),
    categoria_id: this.fb.control<number | null>(null, Validators.required),
    producto_id: this.fb.control<number | null>(null, Validators.required),
    horno_id: this.fb.control<number | null>(null, Validators.required),
    unidad_solicitada: this.fb.nonNullable.control<'kg' | 'canastillas'>('kg'),
    cantidad_kg: this.fb.control<number | null>(null),
    cantidad_canastillas: this.fb.control<number | null>(null),
    // Horas programadas de producción: mínimo 1 (misma regla que el backend).
    horas_produccion: this.fb.control<number | null>(1, [Validators.required, Validators.min(1)]),
  });

  /** Se recalcula solo cuando cambia la categoria elegida. */
  private readonly valores = signal(this.formulario.getRawValue());

  protected readonly productosDeCategoria = computed(() => {
    const categoriaId = this.valores().categoria_id;
    return categoriaId
      ? this.productos().filter((producto) => producto.categoria.id === categoriaId)
      : [];
  });

  protected readonly hornosPosibles = computed(() => {
    const { destino, categoria_id } = this.valores();
    if (destino === 'exportacion') {
      // Para exportacion manda el permiso del horno, no la categoria.
      return this.hornos().filter((horno) => horno.apto_exportacion);
    }
    return categoria_id
      ? this.hornos().filter((horno) => horno.categorias.some((c) => c.id === categoria_id))
      : this.hornos();
  });

  constructor() {
    this.formulario.valueChanges.subscribe(() => this.valores.set(this.formulario.getRawValue()));

    // Si cambia la categoria, el producto elegido puede dejar de valer.
    effect(() => {
      const productos = this.productosDeCategoria();
      const productoId = this.formulario.controls.producto_id.value;
      if (productoId && !productos.some((producto) => producto.id === productoId)) {
        this.formulario.controls.producto_id.setValue(null);
      }
    });

    forkJoin({
      turnos: this.catalogos.listarTurnos(true),
      categorias: this.catalogos.listarCategorias(true),
      hornos: this.catalogos.listarHornos(true),
      productos: this.catalogos.listarProductos(true),
    }).subscribe({
      next: ({ turnos, categorias, hornos, productos }) => {
        this.turnos.set(turnos);
        this.categorias.set(categorias);
        this.hornos.set(hornos);
        this.productos.set(productos);

        const id = this.id();
        if (id) {
          this.cargarOrden(Number(id));
        } else {
          this.cargando.set(false);
        }
      },
      error: () => this.cargando.set(false),
    });
  }

  private cargarOrden(id: number): void {
    this.ordenes.detalle(id).subscribe({
      next: ({ orden }) => {
        this.formulario.patchValue({
          destino: orden.destino,
          turno_id: orden.turno.id,
          categoria_id: orden.categoria.id,
          producto_id: orden.producto.id,
          horno_id: orden.horno.id,
          unidad_solicitada: orden.unidad_solicitada,
          cantidad_kg: orden.unidad_solicitada === 'kg' ? Number(orden.cantidad_programada) : null,
          cantidad_canastillas: orden.cantidad_canastillas_solicitadas
            ? Number(orden.cantidad_canastillas_solicitadas)
            : null,
          // Las órdenes creadas antes de esta función no tienen el dato:
          // se propone el mínimo permitido para que se pueda guardar.
          horas_produccion: orden.horas_produccion ? Number(orden.horas_produccion) : 1,
        });
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.avisos.error('Faltan datos por completar en el formulario.');
      return;
    }

    const valores = this.formulario.getRawValue();
    const datos: OrdenGuardar = {
      turno_id: valores.turno_id!,
      horno_id: valores.horno_id!,
      categoria_id: valores.categoria_id!,
      producto_id: valores.producto_id!,
      destino: valores.destino,
      unidad_solicitada: valores.unidad_solicitada,
      cantidad_kg: valores.unidad_solicitada === 'kg' ? Number(valores.cantidad_kg) : null,
      cantidad_canastillas:
        valores.unidad_solicitada === 'canastillas' ? Number(valores.cantidad_canastillas) : null,
      horas_produccion: Number(valores.horas_produccion),
    };

    this.enviando.set(true);
    const id = this.id();
    const peticion = id
      ? this.ordenes.actualizar(Number(id), datos)
      : this.ordenes.crear(datos);

    peticion.subscribe({
      next: (orden) => {
        this.enviando.set(false);
        this.avisos.exito(id ? 'Orden actualizada.' : `Orden ${orden.numero_orden} creada.`);
        void this.router.navigate(['/ordenes', orden.id]);
      },
      error: () => this.enviando.set(false),
    });
  }
}
