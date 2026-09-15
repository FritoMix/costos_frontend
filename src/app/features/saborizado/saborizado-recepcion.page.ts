import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import type { ItemCatalogo } from '../../core/modelos/catalogos.model';
import type { DetalleOrden, RecepcionGuardar } from '../../core/modelos/produccion.model';
import { AuthService } from '../../core/servicios/auth.service';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { OrdenesService } from '../../core/servicios/ordenes.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { TecladoNumericoComponent } from '../../ui/teclado-numerico.component';

type PasoRecepcion =
  | 'horario'
  | 'sabor'
  | 'cantidad_sabor'
  | 'canastillas'
  | 'resumen';

/**
 * Registro de una recepcion de saborizado, paso a paso (mismo estilo del
 * asistente de registro de horno en produccion).
 *
 * Diseñado para el operario de saborizado: una pregunta por pantalla, teclado
 * numérico grande y el mínimo de escritura. Cada canastilla se pesa y se
 * toca para agregarla: los kilos recibidos son la SUMA de los pesos reales,
 * nunca un estimado.
 */
@Component({
  selector: 'app-saborizado-recepcion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DecimalPipe,
    BotonComponent,
    CargandoComponent,
    TecladoNumericoComponent,
  ],
  template: `
    <div class="mx-auto w-full max-w-xl">
      @if (cargando()) {
        <app-cargando texto="Preparando estación de saborizado…" />
      } @else if (detalle(); as datos) {
        <div class="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-300/30">
          <!-- Cabecera: progreso -->
          <header class="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
            <a
              routerLink="/saborizado"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95"
              aria-label="Salir del registro"
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

          <!-- Contexto de la orden -->
          <div class="border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 text-center sm:px-7">
            <p class="truncate text-xs font-bold text-slate-500">
              {{ datos.orden.producto.nombre_comercial }} ·
              <span class="text-marca-700">{{ datos.orden.horno.nombre }}</span> ·
              <span class="font-mono">#{{ datos.orden.numero_orden }}</span>
            </p>
          </div>

          <!-- Cuerpo -->
          <div class="px-5 py-8 sm:px-8">
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

            <div class="mt-7">
              @switch (pasoActual()) {
                <!-- 1. Horario -->
                @case ('horario') {
                  <div class="anim-entrada mx-auto max-w-sm">
                    <div class="rounded-3xl border-2 border-marca-300 bg-marca-50/60 px-6 py-7">
                      <div class="flex items-center justify-center gap-5">
                        <div class="text-center">
                          <p class="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Inicio</p>
                          <p class="mt-1 text-3xl font-extrabold text-slate-900 tabular-nums">{{ horaInicio() }}</p>
                        </div>
                        <svg class="h-6 w-6 shrink-0 text-marca-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                        <div class="text-center">
                          <p class="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Fin</p>
                          <p class="mt-1 text-3xl font-extrabold text-slate-900 tabular-nums">{{ horaFin() }}</p>
                        </div>
                      </div>
                      <p class="mt-4 text-center text-xs font-semibold text-marca-700">
                        Duración de la recepción: {{ duracionMinutos() }} min
                      </p>
                    </div>

                    <!-- Ajuste por si la recepción ya iba andando -->
                    <div class="mt-4 text-center">
                      <p class="text-xs font-medium text-slate-500">¿Cuánto duró la recepción?</p>
                      <div class="mt-2 flex flex-wrap justify-center gap-2">
                        @for (min of duraciones; track min) {
                          <button
                            type="button"
                            (click)="fijarDuracion(min)"
                            class="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-bold text-slate-600 shadow-2xs transition hover:border-marca-400 hover:bg-marca-50 hover:text-marca-800 active:scale-95"
                          >
                            {{ min }} min
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }

                <!-- 2. Sabor -->
                @case ('sabor') {
                  <div class="anim-entrada space-y-3">
                    @for (sabor of sabores(); track sabor.id) {
                      <button type="button" (click)="saborId.set(sabor.id)" [class]="claseFila(saborId() === sabor.id)">
                        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-marca-50 text-lg">👅</span>
                        <span class="min-w-0 flex-1 text-left font-bold text-slate-900">{{ sabor.nombre }}</span>
                        @if (saborId() === sabor.id) {
                          <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marca-600 text-xs font-black text-white">✓</span>
                        } @else {
                          <span class="block h-6 w-6 shrink-0 rounded-full border-2 border-slate-300"></span>
                        }
                      </button>
                    } @empty {
                      <p class="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/60 px-5 py-6 text-center text-sm font-semibold text-amber-800">
                        No hay sabores activos en catálogos. Pídele al administrador que los cree.
                      </p>
                    }
                  </div>
                }

                <!-- 3. Cantidad de sabor -->
                @case ('cantidad_sabor') {
                  <div class="anim-entrada">
                    <app-teclado-numerico [(valor)]="cantidadSabor" unidad="kg de sabor" />
                  </div>
                }

                <!-- 4. Canastillas -->
                @case ('canastillas') {
                  <div class="anim-entrada">
                    <div class="mx-auto max-w-sm space-y-3">
                      <!-- Visor del peso que se está agregando -->
                      <div class="rounded-3xl border-2 border-slate-200 bg-slate-50/70 px-5 py-4">
                        <p class="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 text-center">
                          Peso de la canastilla
                        </p>
                        <p class="mt-1 text-center font-mono text-3xl font-extrabold text-slate-900 tabular-nums">
                          {{ canastillaActual() || '0' }} <span class="text-sm font-semibold text-slate-400">kg</span>
                        </p>
                        <div class="mt-3">
                          <app-teclado-numerico [(valor)]="canastillaActual" unidad="kg" [maxDigitos]="6" />
                        </div>
                        <app-boton
                          variante="primario"
                          tamano="grande"
                          [anchoCompleto]="true"
                          (click)="agregarCanastilla()"
                          [deshabilitado]="pesoCanastillaValido() === false"
                          class="mt-4"
                        >
                          {{ canastillaActualValor() > 0 ? 'Agregar canastilla' : 'Ingresa el peso y agrega' }}
                        </app-boton>
                      </div>

                      <!-- Lista de canastillas agregadas -->
                      @if (canastillas().length > 0) {
                        <div class="rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
                          <div class="flex items-center justify-between">
                            <p class="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                              Canastillas agregadas
                            </p>
                            <span class="rounded-full bg-slate-200/80 px-2.5 py-0.5 font-mono text-xs font-bold text-slate-700">
                              {{ canastillas().length }}
                            </span>
                          </div>
                          <ul class="mt-2 space-y-1.5">
                            @for (canastilla of canastillas(); track $index) {
                              <li class="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 border border-slate-200">
                                <span class="font-mono text-xs font-bold text-slate-700">Canastilla #{{ $index + 1 }}</span>
                                <span class="font-mono text-sm font-extrabold text-emerald-700">
                                  {{ canastilla | number: '1.0-2' }} kg
                                </span>
                                <button
                                  type="button"
                                  class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                  (click)="quitarCanastilla($index)"
                                  aria-label="Quitar canastilla"
                                >
                                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </li>
                            }
                          </ul>
                          <div class="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5 border border-emerald-200/80">
                            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Total recibido</span>
                            <span class="font-mono text-lg font-black text-emerald-900">
                              {{ totalKg() | number: '1.0-2' }} <span class="text-xs font-semibold text-emerald-700">kg</span>
                            </span>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- 5. Resumen -->
                @case ('resumen') {
                  <div class="anim-entrada">
                    <dl class="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
                      <div class="flex items-center justify-between gap-4 px-5 py-3">
                        <dt class="text-sm font-semibold text-slate-500">Horario</dt>
                        <dd class="text-sm font-extrabold text-slate-900 tabular-nums">
                          {{ horaInicio() }} → {{ horaFin() }}
                        </dd>
                      </div>
                      <div class="flex items-center justify-between gap-4 px-5 py-3">
                        <dt class="text-sm font-semibold text-slate-500">Sabor</dt>
                        <dd class="text-sm font-extrabold text-slate-900">{{ nombreSabor() || '—' }}</dd>
                      </div>
                      <div class="flex items-center justify-between gap-4 px-5 py-3">
                        <dt class="text-sm font-semibold text-slate-500">Sabor usado</dt>
                        <dd class="text-sm font-extrabold text-slate-900">
                          {{ numero(cantidadSabor()) | number: '1.0-2' }} kg
                        </dd>
                      </div>
                      <div class="flex items-center justify-between gap-4 px-5 py-3">
                        <dt class="text-sm font-semibold text-slate-500">Canastillas</dt>
                        <dd class="text-sm font-extrabold text-slate-900">{{ canastillas().length }}</dd>
                      </div>
                      <div class="flex items-center justify-between gap-4 bg-slate-50/70 px-5 py-3">
                        <dt class="text-sm font-semibold text-slate-500">Papa frita recibida</dt>
                        <dd class="text-sm font-extrabold text-emerald-700">
                          {{ totalKg() | number: '1.0-2' }} kg
                        </dd>
                      </div>
                    </dl>
                    @if (editandoId()) {
                      <p class="mt-3 text-center text-xs font-bold text-amber-700">Estás corrigiendo una recepción existente.</p>
                    }
                  </div>
                }
              }
            </div>
          </div>

          <!-- Navegación -->
          <footer class="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-7">
            <app-boton variante="secundario" (click)="atras()" [deshabilitado]="indicePaso() === 0">
              Atrás
            </app-boton>

            @if (pasoActual() === 'resumen') {
              <app-boton variante="primario" tamano="grande" (click)="guardar()" [cargando]="enviando()">
                {{ editandoId() ? 'Guardar corrección' : 'Registrar recepción' }}
              </app-boton>
            } @else {
              <app-boton variante="primario" tamano="grande" (click)="continuar()" [deshabilitado]="!pasoValido()">
                Continuar
              </app-boton>
            }
          </footer>
        </div>

        <!-- Recepciones ya registradas en esta orden -->
        @if (datos.recepciones.length > 0) {
          <div class="mt-5 rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <div class="flex items-center justify-between">
              <p class="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Recepciones ya registradas ({{ datos.recepciones.length }})
              </p>
              @if (editandoId()) {
                <button type="button" (click)="cancelarEdicion()" class="text-xs font-bold text-slate-400 hover:text-slate-600">
                  Cancelar corrección
                </button>
              }
            </div>
            <ul class="mt-3 space-y-1.5">
              @for (recepcion of datos.recepciones; track recepcion.id) {
                <li class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-mono text-xs font-bold text-slate-700">
                        {{ aHHMM(recepcion.hora_inicio) }} – {{ aHHMM(recepcion.hora_fin) }}
                      </span>
                      <span class="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200/60">
                        {{ recepcion.sabor.nombre }}
                      </span>
                    </div>
                    <p class="mt-0.5 text-xs text-slate-500 font-medium">
                      <span class="font-bold text-slate-800">{{ recepcion.canastillas.length }} canastillas</span> ·
                      <span class="font-mono font-bold text-emerald-700">{{ recepcion.kg_recibidos | number: '1.0-2' }} kg</span>
                    </p>
                  </div>
                  @if (puedeEditar(recepcion.usuario.id)) {
                    <button
                      type="button"
                      (click)="editar(recepcion.id)"
                      class="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-marca-300 hover:bg-marca-50 hover:text-marca-800"
                    >
                      Corregir
                    </button>
                  }
                </li>
              }
            </ul>
          </div>
        }
      }
    </div>
  `,
})
export class SaborizadoRecepcionPage {
  readonly id = input.required<string>();

  private readonly ordenes = inject(OrdenesService);
  private readonly catalogos = inject(CatalogosService);
  private readonly avisos = inject(NotificacionesService);
  private readonly auth = inject(AuthService);

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly detalle = signal<DetalleOrden | null>(null);
  protected readonly sabores = signal<ItemCatalogo[]>([]);
  protected readonly editandoId = signal<number | null>(null);

  // --- Datos de la recepción -------------------------------------------------

  /** Momento en que arranca la recepción. Se toma al abrir el registro. */
  private readonly inicio = signal<Date>(new Date());
  /** Duración en minutos de la recepción (editada con botones). */
  protected readonly duracionMin = signal(60);

  protected readonly saborId = signal<number | null>(null);
  protected readonly cantidadSabor = signal('0');
  protected readonly canastillaActual = signal('0');
  protected readonly canastillas = signal<number[]>([]);

  protected readonly indicePaso = signal(0);

  /** Duraciones habituales de una recepción de saborizado. */
  protected readonly duraciones = [30, 45, 60, 90];

  private readonly pasos: PasoRecepcion[] = [
    'horario',
    'sabor',
    'cantidad_sabor',
    'canastillas',
    'resumen',
  ];

  protected readonly totalPasos = computed(() => this.pasos.length);
  protected readonly pasoActual = computed<PasoRecepcion>(() => this.pasos[this.indicePaso()]);
  protected readonly progreso = computed(() => ((this.indicePaso() + 1) / this.totalPasos()) * 100);

  private readonly textos: Record<PasoRecepcion, { etiqueta: string; titulo: string; sub: string }> = {
    horario: {
      etiqueta: 'Horario',
      titulo: '¿Cuánto duró la recepción?',
      sub: 'Se toma automáticamente. Solo toca la duración si hace falta.',
    },
    sabor: {
      etiqueta: 'Sabor',
      titulo: '¿Qué sabor se aplicó?',
      sub: 'Toca el sabor que se usó en esta recepción.',
    },
    cantidad_sabor: {
      etiqueta: 'Insumo',
      titulo: '¿Cuánto sabor se usó?',
      sub: 'Cantidad total de sabor aplicado, en kilos.',
    },
    canastillas: {
      etiqueta: 'Pesaje',
      titulo: 'Pesa cada canastilla',
      sub: 'Ingresa el peso neto de cada canastilla recibida del horno.',
    },
    resumen: { etiqueta: 'Confirmación', titulo: 'Revisa y guarda', sub: 'Verifica antes de registrar la recepción.' },
  };

  protected readonly etiquetaPaso = computed(() => this.textos[this.pasoActual()].etiqueta);
  protected readonly tituloPaso = computed(() => this.textos[this.pasoActual()].titulo);
  protected readonly subtituloPaso = computed(() => this.textos[this.pasoActual()].sub);

  // --- Derivados -------------------------------------------------------------

  /** Hora de inicio en formato de reloj (HH:MM). */
  protected readonly horaInicio = computed(() => this.aHHMM(this.inicio()));

  /** Fin = inicio + duración elegida. */
  protected readonly fin = computed(
    () => new Date(this.inicio().getTime() + this.duracionMin() * 60 * 1000),
  );
  protected readonly horaFin = computed(() => this.aHHMM(this.fin()));
  protected readonly duracionMinutos = computed(
    () => Math.round(this.duracionMin() / 5) * 5,
  );

  protected readonly totalKg = computed(() =>
    Math.round(this.canastillas().reduce((suma, p) => suma + p, 0) * 100) / 100,
  );

  protected readonly canastillaActualValor = computed(() => this.numero(this.canastillaActual()));
  protected readonly pesoCanastillaValido = computed(
    () => this.canastillaActualValor() > 0,
  );

  protected readonly nombreSabor = computed(
    () => this.sabores().find((s) => s.id === this.saborId())?.nombre ?? '',
  );

  protected readonly pasoValido = computed(() => {
    switch (this.pasoActual()) {
      case 'horario':
        return this.duracionMin() > 0;
      case 'sabor':
        return this.saborId() !== null;
      case 'cantidad_sabor':
        return this.numero(this.cantidadSabor()) > 0;
      case 'canastillas':
        // El paso es válido si ya agregó al menos una canastilla con peso.
        return this.canastillas().length > 0;
      default:
        return true;
    }
  });

  constructor() {
    queueMicrotask(() => this.cargar());
  }

  private cargar(): void {
    forkJoin({
      detalle: this.ordenes.detalle(Number(this.id())),
      sabores: this.catalogos.listarSabores(true),
    }).subscribe({
      next: ({ detalle, sabores }) => {
        this.detalle.set(detalle);
        this.sabores.set(sabores);
        this.inicio.set(new Date());
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  // --- Interacciones ---------------------------------------------------------

  protected fijarDuracion(min: number): void {
    this.duracionMin.set(min);
  }

  protected agregarCanastilla(): void {
    const peso = this.canastillaActualValor();
    if (peso > 0) {
      this.canastillas.update((lista) => [...lista, peso]);
      this.canastillaActual.set('0');
    }
  }

  protected quitarCanastilla(indice: number): void {
    this.canastillas.update((lista) => lista.filter((_, i) => i !== indice));
  }

  protected puedeEditar(usuarioId: number): boolean {
    return this.auth.esAdmin() || usuarioId === this.auth.usuario()?.id;
  }

  protected editar(recepcionId: number): void {
    const recepcion = this.detalle()?.recepciones.find((r) => r.id === recepcionId);
    if (!recepcion) {
      return;
    }
    this.editandoId.set(recepcionId);
    this.canastillas.set(recepcion.canastillas.map((c) => Number(c.peso_kg)));
    this.saborId.set(recepcion.sabor.id);
    this.cantidadSabor.set(String(Number(recepcion.cantidad_sabor_kg)));
    const inicio = new Date(recepcion.hora_inicio);
    const fin = new Date(recepcion.hora_fin);
    this.inicio.set(inicio);
    const duracion = Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / 60000));
    this.duracionMin.set(duracion);
    this.indicePaso.set(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected cancelarEdicion(): void {
    this.editandoId.set(null);
    this.indicePaso.set(0);
    this.canastillas.set([]);
    this.saborId.set(null);
    this.cantidadSabor.set('0');
    this.duracionMin.set(60);
    this.inicio.set(new Date());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected guardar(): void {
    if (!this.pasoValidoTotal()) {
      this.avisos.error('Faltan datos: revisa el sabor, las horas y el peso de las canastillas.');
      return;
    }

    const datos: RecepcionGuardar = {
      hora_inicio: this.horaInicio(),
      hora_fin: this.horaFin(),
      sabor_id: this.saborId()!,
      cantidad_sabor_kg: this.numero(this.cantidadSabor()),
      pesos_canastillas: this.canastillas().map((peso) => peso),
    };

    this.enviando.set(true);
    const ordenId = Number(this.id());
    const editando = this.editandoId();
    const peticion = editando
      ? this.ordenes.actualizarRecepcion(ordenId, editando, datos)
      : this.ordenes.crearRecepcion(ordenId, datos);

    peticion.subscribe({
      next: (recepcion) => {
        this.enviando.set(false);
        this.avisos.exito(
          `${editando ? 'Recepción corregida' : 'Recepción registrada'}: ${recepcion.kg_recibidos} kg.`,
        );
        this.cancelarEdicion();
        this.cargar();
      },
      error: () => this.enviando.set(false),
    });
  }

  private pasoValidoTotal(): boolean {
    return (
      this.duracionMin() > 0 &&
      this.saborId() !== null &&
      this.numero(this.cantidadSabor()) > 0 &&
      this.canastillas().length > 0
    );
  }

  // --- Navegación ------------------------------------------------------------

  protected continuar(): void {
    if (!this.pasoValido()) {
      return;
    }
    if (this.indicePaso() < this.totalPasos() - 1) {
      this.indicePaso.update((i) => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  protected atras(): void {
    if (this.indicePaso() > 0) {
      this.indicePaso.update((i) => i - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // --- Utilidades ------------------------------------------------------------

  protected numero(texto: string): number {
    const n = Number(texto);
    return Number.isFinite(n) ? n : 0;
  }

  protected aHHMM(fecha: string | Date): string {
    const f = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return `${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`;
  }

  // --- Estilos ---------------------------------------------------------------

  protected claseFila(seleccionada: boolean): string {
    const base =
      'flex w-full items-center gap-3.5 rounded-2xl border-2 px-4 py-3.5 text-left transition-all duration-150 active:scale-[0.99]';
    return seleccionada
      ? `${base} border-marca-500 bg-marca-50/70 shadow-sm ring-4 ring-marca-500/10`
      : `${base} border-slate-200 bg-white hover:border-marca-300 hover:bg-marca-50/30`;
  }
}
