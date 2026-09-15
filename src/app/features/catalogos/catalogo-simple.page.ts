import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { Observable } from 'rxjs';

import type { CatalogoGuardar, ItemCatalogo } from '../../core/modelos/catalogos.model';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { ConfirmarComponent } from '../../ui/confirmar.component';

type TipoCatalogo = 'categorias' | 'sabores' | 'tipos-desperdicio';

interface Textos {
  titulo: string;
  singular: string;
  descripcion: string;
}

/**
 * Pantalla reutilizable para los catálogos simples (Sabores, Categorías, Desperdicios).
 * Estructura limpia y espaciosa en cuadrícula de 2 columnas.
 */
@Component({
  selector: 'app-catalogo-simple',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
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
            <span>{{ textos().titulo }}</span>
            <span class="rounded-full bg-sky-100 px-3 py-0.5 text-xs font-extrabold text-sky-800 border border-sky-200">
              {{ items().length }} {{ items().length === 1 ? 'registro' : 'registros' }}
            </span>
          </h1>
          <p class="mt-1 text-sm text-slate-500 font-medium">{{ textos().descripcion }}</p>
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
                {{ editando() ? 'Modificar ' + textos().singular : 'Agregar ' + textos().singular }}
              </h2>
              @if (editando()) {
                <span class="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  Modo Edición
                </span>
              }
            </div>

            <form [formGroup]="formulario" (ngSubmit)="guardar()" class="space-y-5">
              <div>
                <label class="etiqueta text-xs font-bold text-slate-700 mb-1.5 block" for="nombre">
                  Nombre de {{ textos().singular }}
                </label>
                <input
                  id="nombre"
                  type="text"
                  placeholder="Ej. Escribe el nombre…"
                  class="campo"
                  formControlName="nombre"
                />
              </div>

              <div class="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
                <label class="flex items-center justify-between cursor-pointer select-none">
                  <div>
                    <span class="text-xs font-bold text-slate-800 block">Estado del catálogo</span>
                    <span class="text-[11px] text-slate-500 font-medium">Habilitar este ítem en el sistema</span>
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
                  {{ editando() ? 'Guardar Cambios' : 'Agregar ' + textos().singular }}
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

        <!-- Columna Derecha: Tabla de Registros -->
        <div class="lg:col-span-7">
          <div class="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Listado de {{ textos().titulo }}
              </h3>
              <span class="text-xs text-slate-500 font-medium">
                Total: {{ items().length }}
              </span>
            </div>

            @if (cargando()) {
              <div class="p-8">
                <app-cargando texto="Cargando catálogo…" />
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="tabla">
                  <thead>
                    <tr>
                      <th class="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500">Nombre</th>
                      <th class="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Estado</th>
                      <th class="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (item of items(); track item.id) {
                      <tr class="hover:bg-sky-50/40 transition-colors">
                        <td class="py-4 px-6 font-bold text-slate-900 text-sm">{{ item.nombre }}</td>
                        <td class="py-4 px-4">
                          @if (item.activo) {
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
                              (click)="editar(item)"
                            >
                              ✏️ Corregir
                            </button>
                            <button
                              type="button"
                              class="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:text-rose-900 border border-rose-200/80 transition-all cursor-pointer"
                              (click)="aEliminar.set(item)"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="3" class="px-6 py-12 text-center text-slate-400 font-medium">
                          Todavía no hay registros en este catálogo.
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
      [titulo]="'¿Eliminar ' + (aEliminar()?.nombre ?? '') + '?'"
      mensaje="Solo se puede eliminar si nunca se ha usado. Si ya tiene datos asociados, desactívalo en vez de eliminarlo."
      textoConfirmar="Sí, eliminar"
      [peligroso]="true"
      (confirmado)="eliminar()"
      (cancelado)="aEliminar.set(null)"
    />
  `,
})
export class CatalogoSimplePage {
  private readonly fb = inject(FormBuilder);
  private readonly catalogos = inject(CatalogosService);
  private readonly avisos = inject(NotificacionesService);
  private readonly ruta = inject(ActivatedRoute);

  private readonly tipo: TipoCatalogo = this.ruta.snapshot.data['catalogo'] ?? 'categorias';

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly items = signal<ItemCatalogo[]>([]);
  protected readonly editando = signal<ItemCatalogo | null>(null);
  protected readonly aEliminar = signal<ItemCatalogo | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    activo: [true],
  });

  constructor() {
    this.cargar();
  }

  protected textos(): Textos {
    switch (this.tipo) {
      case 'sabores':
        return {
          titulo: 'Sabores',
          singular: 'sabor',
          descripcion: 'Los sabores disponibles al registrar una recepción de saborizado.',
        };
      case 'tipos-desperdicio':
        return {
          titulo: 'Tipos de desperdicio',
          singular: 'tipo',
          descripcion: 'Se pueden agregar los que la planta necesite, sin tocar el código.',
        };
      default:
        return {
          titulo: 'Categorías de producto',
          singular: 'categoría',
          descripcion: 'Cambiar el tamaño de la hojuela no crea una categoría nueva.',
        };
    }
  }

  private cargar(): void {
    this.cargando.set(true);
    const peticion =
      this.tipo === 'sabores'
        ? this.catalogos.listarSabores()
        : this.tipo === 'tipos-desperdicio'
          ? this.catalogos.listarTiposDesperdicio()
          : this.catalogos.listarCategorias();

    peticion.subscribe({
      next: (items) => {
        this.items.set(items);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected editar(item: ItemCatalogo): void {
    this.editando.set(item);
    this.formulario.setValue({ nombre: item.nombre, activo: item.activo });
  }

  protected cancelarEdicion(): void {
    this.editando.set(null);
    this.formulario.reset({ nombre: '', activo: true });
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const datos = this.formulario.getRawValue() as CatalogoGuardar;
    const editando = this.editando();
    this.enviando.set(true);

    const peticion: Observable<ItemCatalogo> = editando
      ? this.actualizar(editando.id, datos)
      : this.crear(datos);

    peticion.subscribe({
      next: () => {
        this.enviando.set(false);
        this.avisos.exito(editando ? 'Cambios guardados.' : 'Agregado.');
        this.cancelarEdicion();
        this.cargar();
      },
      error: () => this.enviando.set(false),
    });
  }

  protected eliminar(): void {
    const item = this.aEliminar();
    this.aEliminar.set(null);
    if (!item) {
      return;
    }

    const peticion =
      this.tipo === 'sabores'
        ? this.catalogos.eliminarSabor(item.id)
        : this.tipo === 'tipos-desperdicio'
          ? this.catalogos.eliminarTipoDesperdicio(item.id)
          : this.catalogos.eliminarCategoria(item.id);

    peticion.subscribe({
      next: () => {
        this.avisos.exito(`"${item.nombre}" eliminado.`);
        this.cargar();
      },
    });
  }

  private crear(datos: CatalogoGuardar): Observable<ItemCatalogo> {
    switch (this.tipo) {
      case 'sabores':
        return this.catalogos.crearSabor(datos);
      case 'tipos-desperdicio':
        return this.catalogos.crearTipoDesperdicio(datos);
      default:
        return this.catalogos.crearCategoria(datos);
    }
  }

  private actualizar(id: number, datos: CatalogoGuardar): Observable<ItemCatalogo> {
    switch (this.tipo) {
      case 'sabores':
        return this.catalogos.actualizarSabor(id, datos);
      case 'tipos-desperdicio':
        return this.catalogos.actualizarTipoDesperdicio(id, datos);
      default:
        return this.catalogos.actualizarCategoria(id, datos);
    }
  }
}

