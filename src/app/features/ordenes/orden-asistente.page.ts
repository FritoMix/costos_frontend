import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import type { SafeHtml } from '@angular/platform-browser';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import type { Horno, ItemCatalogo, Producto, Turno } from '../../core/modelos/catalogos.model';
import type { DestinoOrden, OrdenGuardar, UnidadSolicitada } from '../../core/modelos/produccion.model';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { OrdenesService } from '../../core/servicios/ordenes.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';

type ClavePaso =
  | 'destino'
  | 'categoria'
  | 'producto'
  | 'horas'
  | 'horno'
  | 'turno'
  | 'unidad'
  | 'cantidad'
  | 'resumen';

/**
 * Asistente para crear una orden, paso a paso (estilo "Duolingo").
 *
 * Requerimiento del cliente: en planta se pierde tiempo llenando un
 * formulario largo. Aquí el proceso se divide en secciones de una sola
 * pregunta; en cada una el operario TOCA una opción grande que ya viene de
 * la base de datos (turnos, categorías, productos, hornos...), en vez de
 * escribir o buscar en menús.
 *
 * Diseño: un único panel centrado y autocontenido (progreso + pregunta +
 * opciones + navegación dentro de la misma tarjeta). Las listas se muestran
 * como filas uniformes de ancho completo, así el diseño queda simétrico sin
 * importar cuántas opciones haya.
 *
 * Solo es la capa visual del alta: la orden se crea con el mismo servicio y
 * las mismas reglas de negocio que ya validaba el backend.
 */
@Component({
  selector: 'app-orden-asistente',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DecimalPipe, BotonComponent, CargandoComponent],
  template: `
    <div class="mx-auto w-full max-w-xl">
      @if (cargando()) {
        <app-cargando texto="Preparando el asistente…" />
      } @else {
        <div class="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-300/30">
          <!-- Cabecera: progreso + contador + salida -->
          <header class="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
            <a
              routerLink="/ordenes"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95"
              aria-label="Salir del asistente"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </a>
            <div class="relative h-3 flex-1 overflow-hidden rounded-full bg-slate-200/90">
              <div
                class="h-full rounded-full bg-gradient-to-r from-marca-400 to-marca-600 transition-all duration-500 ease-out"
                [style.width.%]="progreso()"
              ></div>
            </div>
            <span class="shrink-0 text-xs font-extrabold text-slate-400 tabular-nums">
              {{ indicePaso() + 1 }} / {{ totalPasos() }}
            </span>
          </header>

          <!-- Cuerpo del paso -->
          <div class="px-5 py-8 sm:px-8">
            <!-- Encabezado del paso (centrado y coherente en todos) -->
            <div class="mx-auto max-w-md text-center">
              <span class="text-[11px] font-extrabold uppercase tracking-widest text-marca-500">
                {{ etiquetaPaso() }} · Paso {{ indicePaso() + 1 }}
              </span>
              <h2 class="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 text-balance sm:text-[26px]">
                {{ tituloPaso() }}
              </h2>
              @if (subtituloPaso()) {
                <p class="mx-auto mt-2 max-w-sm text-sm font-medium text-slate-500">{{ subtituloPaso() }}</p>
              }
            </div>

            <!-- Opciones -->
            <div class="mt-7">
              @switch (pasoActual()) {
                <!-- 1. Destino (dos tejas grandes) -->
                @case ('destino') {
                  <div class="grid grid-cols-2 gap-3 sm:gap-4 anim-entrada">
                    <button type="button" (click)="elegirDestino('nacional')" [class]="claseTeja(destino() === 'nacional')">
                      <span [class]="claseIcono(destino() === 'nacional')">🏭</span>
                      <span class="text-base font-extrabold text-slate-900">Nacional</span>
                      <span class="text-xs font-medium text-slate-500">Consumo en el país</span>
                      @if (destino() === 'nacional') { <span [class]="claseBadge()" [innerHTML]="iconoCheck"></span> }
                    </button>
                    <button type="button" (click)="elegirDestino('exportacion')" [class]="claseTeja(destino() === 'exportacion')">
                      <span [class]="claseIcono(destino() === 'exportacion')">🌎</span>
                      <span class="text-base font-extrabold text-slate-900">Exportación</span>
                      <span class="text-xs font-medium text-slate-500">Hornos habilitados</span>
                      @if (destino() === 'exportacion') { <span [class]="claseBadge()" [innerHTML]="iconoCheck"></span> }
                    </button>
                  </div>
                }

                <!-- 2. Categoría -->
                @case ('categoria') {
                  <div class="space-y-2.5 anim-entrada">
                    @for (categoria of categorias(); track categoria.id) {
                      <button type="button" (click)="elegirCategoria(categoria.id)" [class]="claseFila(categoriaId() === categoria.id)">
                        <span [class]="claseAvatar(categoriaId() === categoria.id)">{{ inicial(categoria.nombre) }}</span>
                        <span class="min-w-0 flex-1 text-left">
                          <span class="block truncate font-bold text-slate-900">{{ categoria.nombre }}</span>
                        </span>
                        <span [innerHTML]="radio(categoriaId() === categoria.id)"></span>
                      </button>
                    } @empty {
                      <p [class]="claseVacio">No hay categorías activas. Créalas en Catálogos.</p>
                    }
                  </div>
                }

                <!-- 3. Producto -->
                @case ('producto') {
                  <div class="space-y-2.5 anim-entrada">
                    @for (producto of productosFiltrados(); track producto.id) {
                      <button type="button" (click)="elegirProducto(producto.id)" [class]="claseFila(productoId() === producto.id)">
                        <span [class]="claseAvatar(productoId() === producto.id)">{{ inicial(producto.nombre_comercial) }}</span>
                        <span class="min-w-0 flex-1 text-left">
                          <span class="block truncate font-bold text-slate-900">{{ producto.nombre_comercial }}</span>
                          <span class="block truncate text-xs font-medium text-slate-500">{{ nombreCategoria() }}</span>
                        </span>
                        <span [innerHTML]="radio(productoId() === producto.id)"></span>
                      </button>
                    } @empty {
                      <p [class]="claseVacio">
                        Esa categoría no tiene productos activos. Créalos en Catálogos › Productos.
                      </p>
                    }
                  </div>
                }

                <!-- 4. Horas de producción (mínimo 1) -->
                @case ('horas') {
                  <div class="anim-entrada mx-auto max-w-sm">
                    <!-- Atajos de jornada -->
                    <div class="grid grid-cols-4 gap-2.5">
                      @for (opcion of horasSugeridas; track opcion) {
                        <button type="button" (click)="elegirHoras(opcion)" [class]="claseHora(horas() === opcion)">
                          <span class="text-xl font-extrabold">{{ opcion }}</span>
                          <span class="text-[10px] font-bold uppercase tracking-wider opacity-70">
                            {{ opcion === 1 ? 'hora' : 'horas' }}
                          </span>
                        </button>
                      }
                    </div>

                    <!-- Ajuste fino -->
                    <div class="mt-4 rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-6">
                      <div class="flex items-center justify-center gap-5">
                        <button
                          type="button"
                          (click)="sumarHoras(-1)"
                          [disabled]="horas() <= 1"
                          [class]="claseStepperHoras()"
                          aria-label="Una hora menos"
                        >
                          −
                        </button>
                        <div class="min-w-28 text-center">
                          <p class="text-5xl font-extrabold text-slate-900 tabular-nums">{{ horas() }}</p>
                          <span class="mt-1 block text-xs font-extrabold uppercase tracking-widest text-slate-400">
                            {{ horas() === 1 ? 'hora' : 'horas' }}
                          </span>
                        </div>
                        <button
                          type="button"
                          (click)="sumarHoras(1)"
                          [class]="claseStepperHoras()"
                          aria-label="Una hora más"
                        >
                          +
                        </button>
                      </div>

                      <p class="mt-4 text-center text-xs font-medium text-slate-500">
                        @if (horas() <= 1) {
                          Es el mínimo permitido: una hora.
                        } @else {
                          Se programa por {{ horas() }} horas completas.
                        }
                      </p>
                    </div>
                  </div>
                }

                <!-- 5. Horno -->
                @case ('horno') {
                  <div class="space-y-2.5 anim-entrada">
                    @for (horno of hornosFiltrados(); track horno.id) {
                      <button type="button" (click)="elegirHorno(horno.id)" [class]="claseFila(hornoId() === horno.id)">
                        <span [class]="claseAvatar(hornoId() === horno.id)">🔥</span>
                        <span class="min-w-0 flex-1 text-left">
                          <span class="block truncate font-bold text-slate-900">{{ horno.nombre }}</span>
                          <span class="block truncate text-xs font-medium text-slate-500">
                            {{ horno.tipo_aceite ? 'Aceite ' + horno.tipo_aceite : 'Línea de producción' }}
                          </span>
                        </span>
                        <span [innerHTML]="radio(hornoId() === horno.id)"></span>
                      </button>
                    } @empty {
                      <p [class]="claseVacio">Ningún horno activo coincide. Revisa Catálogos › Hornos.</p>
                    }
                  </div>
                }

                <!-- 5. Turno -->
                @case ('turno') {
                  <div class="space-y-2.5 anim-entrada">
                    @for (turno of turnos(); track turno.id) {
                      <button type="button" (click)="elegirTurno(turno.id)" [class]="claseFila(turnoId() === turno.id)">
                        <span [class]="claseAvatar(turnoId() === turno.id)">🕒</span>
                        <span class="min-w-0 flex-1 text-left">
                          <span class="block truncate font-bold text-slate-900">{{ turno.nombre }}</span>
                        </span>
                        <span [innerHTML]="radio(turnoId() === turno.id)"></span>
                      </button>
                    } @empty {
                      <p [class]="claseVacio">No hay turnos activos. Créalos en Catálogos.</p>
                    }
                  </div>
                }

                <!-- 6. Unidad (dos tejas grandes) -->
                @case ('unidad') {
                  <div class="grid grid-cols-2 gap-3 sm:gap-4 anim-entrada">
                    <button type="button" (click)="elegirUnidad('kg')" [class]="claseTeja(unidad() === 'kg')">
                      <span [class]="claseIcono(unidad() === 'kg')">⚖️</span>
                      <span class="text-base font-extrabold text-slate-900">Kilogramos</span>
                      <span class="text-xs font-medium text-slate-500">Cantidad directa</span>
                      @if (unidad() === 'kg') { <span [class]="claseBadge()" [innerHTML]="iconoCheck"></span> }
                    </button>
                    <button type="button" (click)="elegirUnidad('canastillas')" [class]="claseTeja(unidad() === 'canastillas')">
                      <span [class]="claseIcono(unidad() === 'canastillas')">🧺</span>
                      <span class="text-base font-extrabold text-slate-900">Canastillas</span>
                      <span class="text-xs font-medium text-slate-500">Se convierten a kg</span>
                      @if (unidad() === 'canastillas') { <span [class]="claseBadge()" [innerHTML]="iconoCheck"></span> }
                    </button>
                  </div>
                }

                <!-- 7. Cantidad (con teclado numérico en pantalla) -->
                @case ('cantidad') {
                  <div class="anim-entrada mx-auto max-w-sm">
                    <!-- Pantalla del monto -->
                    <div class="rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-6 text-center">
                      <input
                        type="text"
                        inputmode="decimal"
                        [value]="cantidadTexto()"
                        (input)="editarTexto($event)"
                        class="w-full border-0 bg-transparent text-center text-6xl font-extrabold text-slate-900 tabular-nums focus:outline-none"
                        aria-label="Cantidad"
                      />
                      <span class="mt-1 block text-xs font-extrabold uppercase tracking-widest text-slate-400">
                        {{ unidad() === 'kg' ? 'kilogramos' : 'canastillas' }}
                      </span>
                    </div>

                    <!-- Sumas rápidas -->
                    <div class="mt-4 flex flex-wrap justify-center gap-2">
                      @for (salto of saltosRapidos(); track salto) {
                        <button
                          type="button"
                          (click)="sumarCantidad(salto)"
                          class="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-bold text-slate-700 shadow-2xs transition hover:border-marca-400 hover:bg-marca-50 hover:text-marca-800 active:scale-95"
                        >
                          +{{ salto }}
                        </button>
                      }
                    </div>

                    <!-- Teclado numérico -->
                    <div class="mt-4 grid grid-cols-3 gap-2.5">
                      @for (n of teclas; track n) {
                        <button type="button" (click)="tecla(n)" [class]="claseTecla()">{{ n }}</button>
                      }
                      <button type="button" (click)="teclaDecimal()" [class]="claseTecla()" aria-label="Punto decimal">,</button>
                      <button type="button" (click)="tecla('0')" [class]="claseTecla()">0</button>
                      <button type="button" (click)="borrar()" [class]="claseTeclaAccion()" aria-label="Borrar">
                        <svg class="mx-auto h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
                        </svg>
                      </button>
                    </div>

                    <div class="mt-3 text-center">
                      <button
                        type="button"
                        (click)="reiniciarCantidad()"
                        class="text-xs font-bold text-slate-400 transition hover:text-slate-600"
                      >
                        Reiniciar
                      </button>
                    </div>

                    @if (unidad() === 'canastillas') {
                      <p class="mt-3 text-center text-xs font-medium text-slate-500">
                        Se convierten a kilos con el peso estándar por canastilla de Catálogos.
                      </p>
                    }
                  </div>
                }

                <!-- 8. Resumen -->
                @case ('resumen') {
                  <div class="anim-entrada">
                    <dl class="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
                      <div class="flex items-center justify-between gap-4 px-5 py-3">
                        <dt class="text-sm font-semibold text-slate-500">Destino</dt>
                        <dd class="text-sm font-extrabold text-slate-900 capitalize">{{ destino() }}</dd>
                      </div>
                      <div class="flex items-center justify-between gap-4 px-5 py-3">
                        <dt class="shrink-0 text-sm font-semibold text-slate-500">Categoría</dt>
                        <dd class="truncate text-right text-sm font-extrabold text-slate-900">{{ nombreCategoria() }}</dd>
                      </div>
                      <div class="flex items-center justify-between gap-4 px-5 py-3">
                        <dt class="shrink-0 text-sm font-semibold text-slate-500">Producto</dt>
                        <dd class="truncate text-right text-sm font-extrabold text-slate-900">{{ nombreProducto() }}</dd>
                      </div>
                      <div class="flex items-center justify-between gap-4 px-5 py-3">
                        <dt class="shrink-0 text-sm font-semibold text-slate-500">Duración de producción</dt>
                        <dd class="text-right text-sm font-extrabold text-slate-900">
                          {{ horas() }} {{ horas() === 1 ? 'hora' : 'horas' }}
                        </dd>
                      </div>
                      <div class="flex items-center justify-between gap-4 px-5 py-3">
                        <dt class="shrink-0 text-sm font-semibold text-slate-500">Horno</dt>
                        <dd class="truncate text-right text-sm font-extrabold text-slate-900">{{ nombreHorno() }}</dd>
                      </div>
                      <div class="flex items-center justify-between gap-4 px-5 py-3">
                        <dt class="shrink-0 text-sm font-semibold text-slate-500">Turno</dt>
                        <dd class="truncate text-right text-sm font-extrabold text-slate-900">{{ nombreTurno() }}</dd>
                      </div>
                      <div class="flex items-center justify-between gap-4 bg-marca-50/50 px-5 py-3.5">
                        <dt class="shrink-0 text-sm font-semibold text-slate-600">Cantidad</dt>
                        <dd class="text-base font-extrabold text-marca-700">
                          {{ cantidad() | number: '1.0-2' }} {{ unidad() === 'kg' ? 'kg' : 'canastillas' }}
                        </dd>
                      </div>
                    </dl>
                  </div>
                }
              }
            </div>
          </div>

          <!-- Navegación (dentro del panel) -->
          <footer class="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-7">
            <app-boton variante="secundario" (click)="atras()" [deshabilitado]="indicePaso() === 0">
              Atrás
            </app-boton>

            @if (pasoActual() === 'resumen') {
              <app-boton variante="primario" tamano="grande" (click)="crear()" [cargando]="enviando()">
                Crear orden
              </app-boton>
            } @else {
              <app-boton variante="primario" tamano="grande" (click)="continuar()" [deshabilitado]="!pasoValido()">
                Continuar
              </app-boton>
            }
          </footer>
        </div>
      }
    </div>
  `,
})
export class OrdenAsistentePage {
  private readonly catalogos = inject(CatalogosService);
  private readonly ordenes = inject(OrdenesService);
  private readonly avisos = inject(NotificacionesService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);

  // Catálogos (todos vienen de la base de datos).
  protected readonly turnos = signal<Turno[]>([]);
  protected readonly categorias = signal<ItemCatalogo[]>([]);
  protected readonly hornos = signal<Horno[]>([]);
  protected readonly productos = signal<Producto[]>([]);

  // Selección del asistente.
  protected readonly destino = signal<DestinoOrden>('nacional');
  protected readonly categoriaId = signal<number | null>(null);
  protected readonly productoId = signal<number | null>(null);
  protected readonly hornoId = signal<number | null>(null);
  protected readonly turnoId = signal<number | null>(null);
  // Horas que se manda la orden a producción. Arranca en 1: es el mínimo
  // permitido, así el paso ya nace válido y el operario solo sube si necesita.
  protected readonly horas = signal<number>(1);
  protected readonly unidad = signal<UnidadSolicitada>('kg');

  // La cantidad se edita como TEXTO (para el teclado en pantalla y el
  // teclado físico), y de ahí se deriva el número que usa el resto.
  protected readonly cantidadTexto = signal('0');
  protected readonly cantidad = computed(() => {
    const n = Number(this.cantidadTexto());
    return Number.isFinite(n) && n > 0 ? n : 0;
  });

  protected readonly indicePaso = signal(0);

  private readonly sanitizer = inject(DomSanitizer);

  // Íconos como HTML fijo (no vienen de datos del usuario). Se marcan como
  // confiables para que Angular no elimine el SVG al sanitizar el innerHTML.
  private readonly svgCheck =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5">' +
    '<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>';
  protected readonly iconoCheck: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(
    `<span class="block h-4 w-4">${this.svgCheck}</span>`,
  );

  private readonly ordenPasos: ClavePaso[] = [
    'destino',
    'categoria',
    'producto',
    'horas',
    'horno',
    'turno',
    'unidad',
    'cantidad',
    'resumen',
  ];

  protected readonly totalPasos = computed(() => this.ordenPasos.length);
  protected readonly pasoActual = computed<ClavePaso>(() => this.ordenPasos[this.indicePaso()]);
  protected readonly progreso = computed(
    () => ((this.indicePaso() + 1) / this.totalPasos()) * 100,
  );

  // Textos de cada paso (etiqueta corta, título y subtítulo).
  private readonly textosPaso: Record<ClavePaso, { etiqueta: string; titulo: string; sub: string }> = {
    destino: { etiqueta: 'Destino', titulo: '¿Cuál es el destino del lote?', sub: 'Mercado nacional o exportación.' },
    categoria: { etiqueta: 'Categoría', titulo: '¿Qué categoría vas a producir?', sub: 'Elige la línea de producto.' },
    producto: { etiqueta: 'Producto', titulo: '¿Qué producto exactamente?', sub: '' },
    horas: {
      etiqueta: 'Duración',
      titulo: '¿Cuántas horas va a producción?',
      sub: 'Solo horas completas. Mínimo 1 hora.',
    },
    horno: { etiqueta: 'Horno', titulo: '¿En qué horno se produce?', sub: '' },
    turno: { etiqueta: 'Turno', titulo: '¿En qué turno?', sub: 'Selecciona el turno operativo.' },
    unidad: { etiqueta: 'Unidad', titulo: '¿Cómo te pidieron la cantidad?', sub: 'En kilos o en canastillas.' },
    cantidad: { etiqueta: 'Cantidad', titulo: '¿Cuánto se va a producir?', sub: 'Toca para sumar o escribe el valor exacto.' },
    resumen: { etiqueta: 'Confirmación', titulo: 'Revisa y confirma', sub: 'Verifica antes de crear la orden.' },
  };

  protected readonly etiquetaPaso = computed(() => this.textosPaso[this.pasoActual()].etiqueta);
  protected readonly tituloPaso = computed(() => {
    // El de producto/horno se personaliza con el contexto elegido.
    const clave = this.pasoActual();
    if (clave === 'cantidad') {
      return this.unidad() === 'kg' ? '¿Cuántos kilos se van a producir?' : '¿Cuántas canastillas?';
    }
    return this.textosPaso[clave].titulo;
  });
  protected readonly subtituloPaso = computed(() => {
    const clave = this.pasoActual();
    if (clave === 'producto') {
      return `Referencias de la categoría ${this.nombreCategoria()}.`;
    }
    if (clave === 'horno') {
      return this.destino() === 'exportacion'
        ? 'Hornos habilitados para exportación.'
        : 'Hornos que pueden producir esa categoría.';
    }
    return this.textosPaso[clave].sub;
  });

  // Salto del stepper de cantidad (+/-) y botones rápidos, según la unidad.
  protected readonly paso = computed(() => (this.unidad() === 'kg' ? 50 : 1));
  protected readonly saltosRapidos = computed(() =>
    this.unidad() === 'kg' ? [50, 100, 500, 1000] : [1, 5, 10, 20],
  );

  protected readonly productosFiltrados = computed(() => {
    const categoria = this.categoriaId();
    return categoria ? this.productos().filter((p) => p.categoria.id === categoria) : [];
  });

  protected readonly hornosFiltrados = computed(() => {
    if (this.destino() === 'exportacion') {
      return this.hornos().filter((h) => h.apto_exportacion);
    }
    const categoria = this.categoriaId();
    return categoria
      ? this.hornos().filter((h) => h.categorias.some((c) => c.id === categoria))
      : this.hornos();
  });

  // Nombres para el resumen.
  protected readonly nombreCategoria = computed(
    () => this.categorias().find((c) => c.id === this.categoriaId())?.nombre ?? '—',
  );
  protected readonly nombreProducto = computed(
    () => this.productos().find((p) => p.id === this.productoId())?.nombre_comercial ?? '—',
  );
  protected readonly nombreHorno = computed(
    () => this.hornos().find((h) => h.id === this.hornoId())?.nombre ?? '—',
  );
  protected readonly nombreTurno = computed(
    () => this.turnos().find((t) => t.id === this.turnoId())?.nombre ?? '—',
  );

  /** Si el paso actual tiene una selección válida para poder continuar. */
  protected readonly pasoValido = computed(() => {
    switch (this.pasoActual()) {
      case 'destino':
        return !!this.destino();
      case 'categoria':
        return this.categoriaId() !== null;
      case 'producto':
        return this.productoId() !== null;
      case 'horas':
        // Regla del negocio: nunca menos de una hora.
        return this.horas() >= 1;
      case 'horno':
        return this.hornoId() !== null;
      case 'turno':
        return this.turnoId() !== null;
      case 'unidad':
        return !!this.unidad();
      case 'cantidad':
        return this.cantidad() > 0;
      default:
        return true;
    }
  });

  protected readonly claseVacio =
    'rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/60 px-5 py-6 text-center text-sm font-semibold text-amber-800';

  constructor() {
    // Si cambia la categoría o el destino, las elecciones que dependían de
    // ellas pueden dejar de ser válidas: se limpian para no arrastrar datos
    // inconsistentes.
    effect(() => {
      const validos = this.productosFiltrados();
      if (this.productoId() && !validos.some((p) => p.id === this.productoId())) {
        this.productoId.set(null);
      }
    });
    effect(() => {
      const validos = this.hornosFiltrados();
      if (this.hornoId() && !validos.some((h) => h.id === this.hornoId())) {
        this.hornoId.set(null);
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
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  // --- Estilos (clases calculadas según selección) -------------------------

  /** Fila de lista de ancho completo (categoría, producto, horno, turno). */
  protected claseFila(seleccionada: boolean): string {
    const base =
      'flex w-full items-center gap-3.5 rounded-2xl border-2 px-4 py-3.5 text-left transition-all ' +
      'duration-150 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-500';
    return seleccionada
      ? `${base} border-marca-500 bg-marca-50/70 shadow-sm ring-4 ring-marca-500/10`
      : `${base} border-slate-200 bg-white hover:border-marca-300 hover:bg-marca-50/30`;
  }

  /** Avatar circular (inicial o emoji) al inicio de cada fila. */
  protected claseAvatar(seleccionada: boolean): string {
    const base =
      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-extrabold transition-colors duration-150';
    return seleccionada ? `${base} bg-marca-600 text-white` : `${base} bg-slate-100 text-slate-500`;
  }

  /** Teja grande centrada (destino, unidad). */
  protected claseTeja(seleccionada: boolean): string {
    const base =
      'relative flex flex-col items-center gap-1.5 rounded-3xl border-2 px-4 py-7 text-center transition-all ' +
      'duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-500';
    return seleccionada
      ? `${base} border-marca-500 bg-marca-50/70 shadow-lg shadow-marca-500/10 ring-4 ring-marca-500/10`
      : `${base} border-slate-200 bg-white hover:border-marca-300 hover:bg-marca-50/30 hover:shadow-md`;
  }

  /** Cuadro que enmarca el emoji dentro de la teja grande. */
  protected claseIcono(seleccionada: boolean): string {
    const base =
      'mb-1 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition-colors duration-150';
    return seleccionada ? `${base} bg-marca-100` : `${base} bg-slate-100`;
  }

  /** Insignia ✓ en la esquina de la teja seleccionada. */
  protected claseBadge(): string {
    return (
      'absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-marca-600 ' +
      'text-white shadow-sm anim-escala'
    );
  }

  /** Dígitos del 1 al 9 del teclado numérico (el 0 y las acciones van aparte). */
  protected readonly teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  /** Tecla numérica del teclado en pantalla. */
  protected claseTecla(): string {
    return (
      'flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl ' +
      'font-extrabold text-slate-700 shadow-2xs transition hover:border-marca-400 hover:bg-marca-50 ' +
      'hover:text-marca-800 active:scale-95 active:bg-marca-100'
    );
  }

  /** Tecla de acción (borrar): un poco más apagada. */
  protected claseTeclaAccion(): string {
    return (
      'flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 ' +
      'text-slate-500 shadow-2xs transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 active:scale-95'
    );
  }

  /** Indicador circular (radio) al final de cada fila: vacío o con ✓. */
  protected radio(seleccionada: boolean): SafeHtml {
    const html = seleccionada
      ? '<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marca-600 text-white anim-escala">' +
        `<span class="block h-3.5 w-3.5">${this.svgCheck}</span></span>`
      : '<span class="block h-6 w-6 shrink-0 rounded-full border-2 border-slate-300"></span>';
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  /**
   * Monograma de 1 o 2 letras para el avatar de las filas sin emoji: toma la
   * inicial de las dos primeras palabras (así "Papa Hojuela" → "PH" y no
   * todas quedan con la misma letra).
   */
  protected inicial(nombre: string): string {
    const palabras = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (palabras.length === 0) {
      return '·';
    }
    const letras = palabras.slice(0, 2).map((p) => p[0]);
    return letras.join('').toUpperCase();
  }

  // --- Selección en cada paso (avanza sola al elegir para dar fluidez) ------

  protected elegirDestino(valor: DestinoOrden): void {
    this.destino.set(valor);
    this.avanzarPronto();
  }

  protected elegirCategoria(id: number): void {
    this.categoriaId.set(id);
    this.avanzarPronto();
  }

  protected elegirProducto(id: number): void {
    this.productoId.set(id);
    this.avanzarPronto();
  }

  protected elegirHorno(id: number): void {
    this.hornoId.set(id);
    this.avanzarPronto();
  }

  // --- Horas de producción -------------------------------------------------

  /** Jornadas típicas de planta, para elegir de un toque. */
  protected readonly horasSugeridas = [1, 2, 4, 8];

  protected elegirHoras(valor: number): void {
    this.horas.set(valor);
    this.avanzarPronto();
  }

  /**
   * Sube o baja de a UNA hora completa: en la planta no se programan medias
   * horas. Nunca baja del mínimo de 1.
   */
  protected sumarHoras(delta: number): void {
    this.horas.set(Math.max(1, Math.round(this.horas() + delta)));
  }

  protected claseHora(seleccionada: boolean): string {
    const base =
      'flex flex-col items-center justify-center gap-0.5 rounded-2xl border-2 py-4 transition-all ' +
      'duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-500';
    return seleccionada
      ? `${base} border-marca-500 bg-marca-600 text-white shadow-lg shadow-marca-500/20`
      : `${base} border-slate-200 bg-white text-slate-700 hover:border-marca-300 hover:bg-marca-50/40`;
  }

  protected claseStepperHoras(): string {
    return (
      'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white ' +
      'text-3xl font-extrabold text-slate-600 shadow-2xs transition hover:border-marca-400 hover:bg-marca-50 ' +
      'hover:text-marca-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'
    );
  }

  protected elegirTurno(id: number): void {
    this.turnoId.set(id);
    this.avanzarPronto();
  }

  protected elegirUnidad(valor: UnidadSolicitada): void {
    this.unidad.set(valor);
    this.cantidadTexto.set('0');
    this.avanzarPronto();
  }

  // --- Cantidad ------------------------------------------------------------

  private fijarNumero(n: number): void {
    // Convierte a texto sin ceros sobrantes: 600 -> "600", 12.5 -> "12.5".
    this.cantidadTexto.set(String(Math.max(0, Math.round(n * 100) / 100)));
  }

  protected sumarCantidad(delta: number): void {
    this.fijarNumero(this.cantidad() + delta);
  }

  protected reiniciarCantidad(): void {
    this.cantidadTexto.set('0');
  }

  /** Al escribir con el teclado físico: solo dígitos y un punto decimal. */
  protected editarTexto(evento: Event): void {
    const bruto = (evento.target as HTMLInputElement).value;
    this.cantidadTexto.set(this.limpiar(bruto));
  }

  /** Teclas del teclado numérico en pantalla. */
  protected tecla(digito: string): void {
    const actual = this.cantidadTexto();
    // Si está en "0", el dígito lo reemplaza (no queda "05").
    const nuevo = actual === '0' ? digito : actual + digito;
    if (nuevo.replace('.', '').length > 9) {
      return; // límite razonable de longitud
    }
    this.cantidadTexto.set(nuevo);
  }

  protected teclaDecimal(): void {
    const actual = this.cantidadTexto();
    if (actual.includes('.')) {
      return;
    }
    this.cantidadTexto.set((actual === '' ? '0' : actual) + '.');
  }

  protected borrar(): void {
    const recortado = this.cantidadTexto().slice(0, -1);
    this.cantidadTexto.set(recortado === '' ? '0' : recortado);
  }

  /** Deja solo dígitos y un único punto decimal. */
  private limpiar(valor: string): string {
    let limpio = valor.replace(/[^\d.]/g, '');
    const partes = limpio.split('.');
    if (partes.length > 2) {
      limpio = partes[0] + '.' + partes.slice(1).join('');
    }
    return limpio === '' ? '0' : limpio;
  }

  // --- Navegación ----------------------------------------------------------

  /**
   * Tras elegir en un paso de una sola opción, avanza solo después de un
   * instante corto: el operario alcanza a ver el ✓ y sigue sin tocar otro
   * botón. En cantidad y resumen no auto-avanza.
   */
  private avanzarPronto(): void {
    setTimeout(() => {
      if (this.pasoValido() && this.pasoActual() !== 'resumen' && this.pasoActual() !== 'cantidad') {
        this.continuar();
      }
    }, 220);
  }

  protected continuar(): void {
    if (!this.pasoValido()) {
      return;
    }
    if (this.indicePaso() < this.totalPasos() - 1) {
      this.indicePaso.update((i) => i + 1);
      this.subirArriba();
    }
  }

  protected atras(): void {
    if (this.indicePaso() > 0) {
      this.indicePaso.update((i) => i - 1);
      this.subirArriba();
    }
  }

  private subirArriba(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected crear(): void {
    const datos: OrdenGuardar = {
      turno_id: this.turnoId()!,
      horno_id: this.hornoId()!,
      categoria_id: this.categoriaId()!,
      producto_id: this.productoId()!,
      destino: this.destino(),
      unidad_solicitada: this.unidad(),
      cantidad_kg: this.unidad() === 'kg' ? this.cantidad() : null,
      cantidad_canastillas: this.unidad() === 'canastillas' ? this.cantidad() : null,
      horas_produccion: this.horas(),
    };

    this.enviando.set(true);
    this.ordenes.crear(datos).subscribe({
      next: (orden) => {
        this.enviando.set(false);
        this.avisos.exito(`Orden ${orden.numero_orden} creada.`);
        void this.router.navigate(['/ordenes', orden.id]);
      },
      error: () => this.enviando.set(false),
    });
  }
}
