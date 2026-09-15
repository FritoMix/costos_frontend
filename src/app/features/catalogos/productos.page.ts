import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import type { ItemCatalogo, Producto, ProductoGuardar } from '../../core/modelos/catalogos.model';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { ConfirmarComponent } from '../../ui/confirmar.component';

/** Productos (referencias comerciales) y su peso estimado por canastilla. */
@Component({
  selector: 'app-productos',
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
      <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <a routerLink="/catalogos" class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition mb-2">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Volver a Catálogos Maestros
          </a>
          <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <span>Catálogo de Productos</span>
            <span class="rounded-full bg-sky-100 px-3 py-0.5 text-xs font-extrabold text-sky-800 border border-sky-200">
              {{ productos().length }} productos
            </span>
          </h1>
          <p class="mt-1 text-sm text-slate-500 font-medium">Referencias comerciales de frituras, categorías y peso estimado por canastilla.</p>
        </div>
      </header>

      <!-- Grid 2 Columnas Desapeñuscado -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Columna Izquierda: Formulario de Registro / Edición -->
        <div class="lg:col-span-5">
          <div class="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs transition-all">
            <div class="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
                <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 text-xs">
                  {{ editando() ? '✏️' : '➕' }}
                </span>
                {{ editando() ? 'Modificar Producto' : 'Crear Nuevo Producto' }}
              </h2>
              @if (editando()) {
                <span class="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  Modo Edición
                </span>
              }
            </div>

            <form [formGroup]="formulario" (ngSubmit)="guardar()" class="space-y-4.5">
              <div>
                <label class="etiqueta text-xs font-bold text-slate-700 mb-1.5 block" for="nombre">
                  Nombre Comercial del Producto
                </label>
                <input
                  id="nombre"
                  type="text"
                  placeholder="Ej. Papas Caseras Naturales 115g"
                  class="campo"
                  formControlName="nombre_comercial"
                />
              </div>

              <div>
                <label class="etiqueta text-xs font-bold text-slate-700 mb-1.5 block" for="categoria">Categoría</label>
                <select id="categoria" class="campo" formControlName="categoria_id">
                  <option [ngValue]="null" disabled>Selecciona una categoría…</option>
                  @for (categoria of categorias(); track categoria.id) {
                    <option [ngValue]="categoria.id">{{ categoria.nombre }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="etiqueta text-xs font-bold text-slate-700 mb-1.5 block" for="peso">
                  Peso Estimado por Canastilla (kg)
                </label>
                <input
                  id="peso"
                  type="number"
                  inputmode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="Ej. 8.50"
                  class="campo font-mono"
                  formControlName="peso_estandar_canastilla_kg"
                />
                <p class="mt-1 text-[11px] text-slate-500 font-medium">
                  Se usa para calcular canastillas pedidas. Si se omite, toma la configuración general.
                </p>
              </div>

              <div class="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
                <label class="flex items-center justify-between cursor-pointer select-none">
                  <div>
                    <span class="text-xs font-bold text-slate-800 block">Producto Activo</span>
                    <span class="text-[11px] text-slate-500 font-medium">Disponible para órdenes de producción</span>
                  </div>
                  <input
                    type="checkbox"
                    formControlName="activo"
                    class="h-5 w-5 rounded border-slate-300 text-marca-600 focus:ring-marca-500 cursor-pointer"
                  />
                </label>
              </div>

              <div class="flex items-center gap-3 pt-2">
                <app-boton tipo="submit" variante="primario" [anchoCompleto]="true" [cargando]="enviando()">
                  {{ editando() ? 'Guardar Cambios' : 'Registrar Producto' }}
                </app-boton>
                @if (editando()) {
                  <app-boton variante="secundario" (click)="cancelarEdicion()">
                    Cancelar
                  </app-boton>
                }
              </div>
            </form>
          </div>
        </div>

        <!-- Columna Derecha: Tabla de Productos -->
        <div class="lg:col-span-7">
          <div class="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Productos Registrados
              </h3>
              <span class="text-xs text-slate-500 font-medium">
                Total: {{ productos().length }}
              </span>
            </div>

            @if (cargando()) {
              <div class="p-8">
                <app-cargando texto="Cargando catálogo de productos…" />
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="tabla">
                  <thead>
                    <tr>
                      <th class="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500">Producto</th>
                      <th class="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Categoría</th>
                      <th class="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Kg / Canastilla</th>
                      <th class="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Estado</th>
                      <th class="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (producto of productos(); track producto.id) {
                      <tr class="hover:bg-sky-50/40 transition-colors">
                        <td class="py-4 px-6 font-bold text-slate-900 text-sm">{{ producto.nombre_comercial }}</td>
                        <td class="py-4 px-4">
                          <span class="inline-flex items-center rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 border border-sky-200/60">
                            {{ producto.categoria.nombre }}
                          </span>
                        </td>
                        <td class="py-4 px-4 text-right font-mono font-bold text-slate-800 text-xs">
                          {{
                            producto.peso_estandar_canastilla_kg
                              ? (producto.peso_estandar_canastilla_kg | number: '1.0-2') + ' kg'
                              : '—'
                          }}
                        </td>
                        <td class="py-4 px-4">
                          @if (producto.activo) {
                            <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200/60">
                              <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                              Activo
                            </span>
                          } @else {
                            <span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 border border-slate-200">
                              <span class="h-2 w-2 rounded-full bg-slate-400"></span>
                              Inactivo
                            </span>
                          }
                        </td>
                        <td class="py-4 px-6 text-right whitespace-nowrap">
                          <div class="inline-flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              class="inline-flex items-center gap-1 rounded-xl bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 hover:text-sky-900 border border-sky-200/80 transition-all cursor-pointer"
                              (click)="editar(producto)"
                            >
                              ✏️ Corregir
                            </button>
                            <button
                              type="button"
                              class="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:text-rose-900 border border-rose-200/80 transition-all cursor-pointer"
                              (click)="aEliminar.set(producto)"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="5" class="px-6 py-12 text-center text-slate-400 font-medium">
                          Todavía no hay productos registrados.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>

      </div>
    </div>

    <app-confirmar
      [abierto]="aEliminar() !== null"
      [titulo]="'¿Eliminar ' + (aEliminar()?.nombre_comercial ?? '') + '?'"
      mensaje="Solo se puede eliminar si no tiene órdenes registradas. Si ya las tiene, desactívalo."
      textoConfirmar="Sí, eliminar"
      [peligroso]="true"
      (confirmado)="eliminar()"
      (cancelado)="aEliminar.set(null)"
    />
  `,
})
export class ProductosPage {
  private readonly fb = inject(FormBuilder);
  private readonly catalogos = inject(CatalogosService);
  private readonly avisos = inject(NotificacionesService);

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly categorias = signal<ItemCatalogo[]>([]);
  protected readonly editando = signal<Producto | null>(null);
  protected readonly aEliminar = signal<Producto | null>(null);

  protected readonly formulario = this.fb.group({
    nombre_comercial: this.fb.nonNullable.control('', Validators.required),
    categoria_id: this.fb.control<number | null>(null, Validators.required),
    peso_estandar_canastilla_kg: this.fb.control<number | null>(null),
    activo: this.fb.nonNullable.control(true),
  });

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    forkJoin({
      productos: this.catalogos.listarProductos(),
      categorias: this.catalogos.listarCategorias(true),
    }).subscribe({
      next: ({ productos, categorias }) => {
        this.productos.set(productos);
        this.categorias.set(categorias);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected editar(producto: Producto): void {
    this.editando.set(producto);
    this.formulario.setValue({
      nombre_comercial: producto.nombre_comercial,
      categoria_id: producto.categoria.id,
      peso_estandar_canastilla_kg: producto.peso_estandar_canastilla_kg
        ? Number(producto.peso_estandar_canastilla_kg)
        : null,
      activo: producto.activo,
    });
  }

  protected cancelarEdicion(): void {
    this.editando.set(null);
    this.formulario.reset({ nombre_comercial: '', activo: true });
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const datos: ProductoGuardar = {
      nombre_comercial: valores.nombre_comercial,
      categoria_id: valores.categoria_id!,
      activo: valores.activo,
      peso_estandar_canastilla_kg: valores.peso_estandar_canastilla_kg
        ? Number(valores.peso_estandar_canastilla_kg)
        : null,
    };

    const editando = this.editando();
    this.enviando.set(true);
    const peticion = editando
      ? this.catalogos.actualizarProducto(editando.id, datos)
      : this.catalogos.crearProducto(datos);

    peticion.subscribe({
      next: () => {
        this.enviando.set(false);
        this.avisos.exito(editando ? 'Producto actualizado.' : 'Producto agregado.');
        this.cancelarEdicion();
        this.cargar();
      },
      error: () => this.enviando.set(false),
    });
  }

  protected eliminar(): void {
    const producto = this.aEliminar();
    this.aEliminar.set(null);
    if (!producto) {
      return;
    }
    this.catalogos.eliminarProducto(producto.id).subscribe(() => {
      this.avisos.exito(`"${producto.nombre_comercial}" eliminado.`);
      this.cargar();
    });
  }
}
