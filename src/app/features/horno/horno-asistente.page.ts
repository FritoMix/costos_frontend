import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import type { ItemCatalogo } from '../../core/modelos/catalogos.model';
import type { DetalleOrden, RegistroHornoGuardar } from '../../core/modelos/produccion.model';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { OrdenesService } from '../../core/servicios/ordenes.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { TecladoNumericoComponent } from '../../ui/teclado-numerico.component';

type PasoTanda =
  | 'horario'
  | 'bultos'
  | 'temperatura'
  | 'personal_zona_humeda'
  | 'personal_seleccion'
  | 'aceite_inicial'
  | 'aceite_final'
  | 'desperdicio'
  | 'resumen';

/**
 * Registro de una tanda de fritura, paso a paso (mismo estilo del asistente
 * de órdenes).
 *
 * Pensado para el operario que está en la máquina: una pregunta por
 * pantalla, teclado grande y cero escritura con teclado físico.
 *
 * El HORARIO no se pide: la tanda arranca en el momento en que se abre el
 * registro y cada tanda dura una hora, así que el fin se calcula solo. Se
 * deja un ajuste rápido por si el operario registra la tanda un rato
 * después de haberla empezado.
 */
@Component({
  selector: 'app-horno-asistente',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DecimalPipe, BotonComponent, CargandoComponent, TecladoNumericoComponent],
  template: `
    <div class="mx-auto w-full max-w-xl">
      @if (cargando()) {
        <app-cargando texto="Preparando el registro…" />
      } @else if (detalle(); as datos) {
        <div class="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-300/30">
          <!-- Cabecera: progreso -->
          <header class="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
            <a
              routerLink="/horno"
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
                <!-- 1. Horario automático -->
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
                        Duración de la tanda: 1 hora
                      </p>
                    </div>

                    <!-- Ajuste por si la tanda empezó antes de registrarla -->
                    <div class="mt-4 text-center">
                      <p class="text-xs font-medium text-slate-500">¿La tanda empezó antes?</p>
                      <div class="mt-2 flex flex-wrap justify-center gap-2">
                        @for (min of ajustes; track min) {
                          <button
                            type="button"
                            (click)="atrasarInicio(min)"
                            class="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-bold text-slate-600 shadow-2xs transition hover:border-marca-400 hover:bg-marca-50 hover:text-marca-800 active:scale-95"
                          >
                            −{{ min }} min
                          </button>
                        }
                        <button
                          type="button"
                          (click)="reiniciarHora()"
                          class="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-bold text-slate-400 shadow-2xs transition hover:bg-slate-100"
                        >
                          Ahora
                        </button>
                      </div>
                    </div>
                  </div>
                }

                <!-- 2. Bultos -->
                @case ('bultos') {
                  <div class="anim-entrada">
                    @if (tecladoBultosAbierto()) {
                      <app-teclado-numerico [(valor)]="bultos" unidad="bultos de papa cruda" />
                    } @else {
                      <!-- Visor: el mismo lenguaje visual del teclado numérico -->
                      <div
                        class="mx-auto max-w-md rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-6 text-center"
                      >
                        <p class="text-6xl font-extrabold text-slate-900 tabular-nums">{{ bultos() || '0' }}</p>
                        <span class="mt-1 block text-xs font-extrabold uppercase tracking-widest text-slate-400">
                          bultos de papa cruda
                        </span>
                      </div>

                      <!-- Un toque y listo: la tanda siempre va entre 30 y 55 bultos -->
                      <div class="mx-auto mt-4 flex max-w-md flex-wrap justify-center gap-2.5">
                        @for (b of bultosComunes; track b) {
                          <button type="button" (click)="bultos.set(b)" [class]="claseValor(bultos() === b, 'text-2xl')">
                            {{ b }}
                          </button>
                        }
                      </div>
                    }

                    <div class="mt-4 flex justify-center">
                      <button
                        type="button"
                        (click)="alternarTecladoBultos()"
                        class="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 transition hover:bg-slate-100 hover:text-marca-700"
                      >
                        {{ tecladoBultosAbierto() ? 'Ver cantidades habituales' : 'Otra cantidad' }}
                      </button>
                    </div>

                    @if (pesoBulto() > 0 && numero(bultos()) > 0) {
                      <p class="mt-2 text-center text-xs font-semibold text-slate-500">
                        Equivale a {{ numero(bultos()) * pesoBulto() | number: '1.0-2' }} kg de papa cruda
                      </p>
                    }
                  </div>
                }

                <!-- 3. Temperatura -->
                @case ('temperatura') {
                  <div class="anim-entrada">
                    @if (tecladoTemperaturaAbierto()) {
                      <app-teclado-numerico [(valor)]="temperatura" unidad="grados centígrados" />
                    } @else {
                      <div
                        class="mx-auto max-w-md rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-6 text-center"
                      >
                        <p class="text-6xl font-extrabold text-slate-900 tabular-nums">{{ temperatura() || '0' }}</p>
                        <span class="mt-1 block text-xs font-extrabold uppercase tracking-widest text-slate-400">
                          grados centígrados
                        </span>
                      </div>

                      <!-- El aceite de freído trabaja entre 165 y 190 °C -->
                      <div class="mx-auto mt-4 flex max-w-md flex-wrap justify-center gap-2.5">
                        @for (t of temperaturasComunes; track t) {
                          <button
                            type="button"
                            (click)="temperatura.set(t)"
                            [class]="claseValor(temperatura() === t, 'text-xl')"
                          >
                            {{ t }}
                          </button>
                        }
                      </div>
                    }

                    <div class="mt-4 flex justify-center">
                      <button
                        type="button"
                        (click)="alternarTecladoTemperatura()"
                        class="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 transition hover:bg-slate-100 hover:text-marca-700"
                      >
                        {{ tecladoTemperaturaAbierto() ? 'Ver temperaturas habituales' : 'Otra temperatura' }}
                      </button>
                    </div>
                  </div>
                }

                <!-- 4. Personal de zona húmeda -->
                @case ('personal_zona_humeda') {
                  <div class="anim-entrada">
                    <div class="flex flex-wrap justify-center gap-3">
                      @for (n of personalZonaHumeda; track n) {
                        <button
                          type="button"
                          (click)="operariosZonaHumeda.set(n)"
                          [class]="claseValorGrande(operariosZonaHumeda() === n)"
                        >
                          {{ n }}
                        </button>
                      }
                    </div>
                    @if (operariosZonaHumeda() > 0) {
                      <p class="mt-5 text-center text-xs font-semibold text-slate-500">
                        {{ operariosZonaHumeda() }} {{ operariosZonaHumeda() === 1 ? 'persona' : 'personas' }} en zona
                        húmeda
                      </p>
                    }
                  </div>
                }

                <!-- 5. Personal de selección de papa freída -->
                @case ('personal_seleccion') {
                  <div class="anim-entrada">
                    <div class="flex flex-wrap justify-center gap-3">
                      @for (n of personalSeleccion; track n) {
                        <button
                          type="button"
                          (click)="operariosSeleccion.set(n)"
                          [class]="claseValorGrande(operariosSeleccion() === n)"
                        >
                          {{ n }}
                        </button>
                      }
                    </div>
                    @if (operariosSeleccion() > 0) {
                      <p class="mt-5 text-center text-xs font-semibold text-slate-500">
                        {{ operariosSeleccion() }} {{ operariosSeleccion() === 1 ? 'persona' : 'personas' }} en
                        selección
                      </p>
                    }
                  </div>
                }

                <!-- 5 y 6. Niveles de aceite -->
                @case ('aceite_inicial') {
                  <div class="anim-entrada">
                    <app-teclado-numerico [(valor)]="aceiteInicial" unidad="centímetros" />
                  </div>
                }
                @case ('aceite_final') {
                  <div class="anim-entrada">
                    <app-teclado-numerico [(valor)]="aceiteFinal" unidad="centímetros" />
                    @if (consumoCm() !== null) {
                      <p
                        class="mt-4 text-center text-sm font-bold"
                        [class]="consumoCm()! >= 0 ? 'text-emerald-700' : 'text-rose-600'"
                      >
                        @if (consumoCm()! >= 0) {
                          Consumo de aceite: {{ consumoCm() | number: '1.0-2' }} cm
                        } @else {
                          El nivel final no puede ser mayor que el inicial
                        }
                      </p>
                    }
                  </div>
                }

                <!-- 7. Desperdicio -->
                @case ('desperdicio') {
                  <div class="anim-entrada mx-auto max-w-sm">
                    @if (!hayDesperdicio()) {
                      <div class="grid grid-cols-2 gap-3">
                        <button type="button" (click)="continuar()" [class]="claseTarjetaGrande(false)">
                          <span class="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">✅</span>
                          <span class="text-base font-extrabold text-slate-900">Sin desperdicio</span>
                          <span class="text-xs font-medium text-slate-500">Tanda limpia</span>
                        </button>
                        <button type="button" (click)="hayDesperdicio.set(true)" [class]="claseTarjetaGrande(false)">
                          <span class="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">⚠️</span>
                          <span class="text-base font-extrabold text-slate-900">Sí hubo</span>
                          <span class="text-xs font-medium text-slate-500">Registrar merma</span>
                        </button>
                      </div>
                    } @else {
                      <div class="space-y-3">
                        @for (tipo of tiposDesperdicio(); track tipo.id) {
                          <button type="button" (click)="tipoDesperdicioId.set(tipo.id)" [class]="claseFila(tipoDesperdicioId() === tipo.id)">
                            <span class="min-w-0 flex-1 text-left font-bold text-slate-900">{{ tipo.nombre }}</span>
                            @if (tipoDesperdicioId() === tipo.id) {
                              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marca-600 text-xs font-black text-white">✓</span>
                            } @else {
                              <span class="block h-6 w-6 shrink-0 rounded-full border-2 border-slate-300"></span>
                            }
                          </button>
                        } @empty {
                          <p class="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/60 px-5 py-6 text-center text-sm font-semibold text-amber-800">
                            No hay tipos de desperdicio configurados.
                          </p>
                        }

                        @if (tipoDesperdicioId()) {
                          <div class="pt-2">
                            <app-teclado-numerico [(valor)]="cantidadDesperdicio" unidad="kg de desperdicio" />
                          </div>
                        }

                        <button
                          type="button"
                          (click)="quitarDesperdicio()"
                          class="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600"
                        >
                          En realidad no hubo desperdicio
                        </button>
                      </div>
                    }
                  </div>
                }

                <!-- 8. Resumen -->
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
                        <dt class="text-sm font-semibold text-slate-500">Papa cruda</dt>
                        <dd class="text-sm font-extrabold text-slate-900">
                          {{ numero(bultos()) | number: '1.0-2' }} bultos
                          @if (pesoBulto() > 0) {
                            <span class="font-medium text-slate-500">
                              ({{ numero(bultos()) * pesoBulto() | number: '1.0-0' }} kg)
                            </span>
                          }
                        </dd>
                      </div>
                      <div class="flex items-center justify-between gap-4 px-5 py-3">
                        <dt class="text-sm font-semibold text-slate-500">Temperatura</dt>
                        <dd class="text-sm font-extrabold text-slate-900">{{ numero(temperatura()) }} °C</dd>
                      </div>
                      <div class="flex items-center justify-between gap-4 px-5 py-3">
                        <dt class="text-sm font-semibold text-slate-500">Zona húmeda</dt>
                        <dd class="text-sm font-extrabold text-slate-900">
                          {{ operariosZonaHumeda() }} {{ operariosZonaHumeda() === 1 ? 'persona' : 'personas' }}
                        </dd>
                      </div>
                      <div class="flex items-center justify-between gap-4 px-5 py-3">
                        <dt class="text-sm font-semibold text-slate-500">Selección de papa freída</dt>
                        <dd class="text-sm font-extrabold text-slate-900">
                          {{ operariosSeleccion() }} {{ operariosSeleccion() === 1 ? 'persona' : 'personas' }}
                        </dd>
                      </div>
                      <div class="flex items-center justify-between gap-4 px-5 py-3">
                        <dt class="text-sm font-semibold text-slate-500">Aceite</dt>
                        <dd class="text-sm font-extrabold text-slate-900">
                          {{ numero(aceiteInicial()) }} → {{ numero(aceiteFinal()) }} cm
                          <span class="font-medium text-slate-500">({{ consumoCm() | number: '1.0-2' }} cm)</span>
                        </dd>
                      </div>
                      <div class="flex items-center justify-between gap-4 bg-slate-50/70 px-5 py-3">
                        <dt class="text-sm font-semibold text-slate-500">Desperdicio</dt>
                        <dd class="text-sm font-extrabold text-slate-900">
                          @if (tipoDesperdicioId() && numero(cantidadDesperdicio()) > 0) {
                            {{ nombreDesperdicio() }} · {{ numero(cantidadDesperdicio()) | number: '1.0-2' }} kg
                          } @else {
                            <span class="text-emerald-700">Sin desperdicio</span>
                          }
                        </dd>
                      </div>
                    </dl>
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
                Guardar tanda
              </app-boton>
            } @else {
              <app-boton variante="primario" tamano="grande" (click)="continuar()" [deshabilitado]="!pasoValido()">
                Continuar
              </app-boton>
            }
          </footer>
        </div>

        <!-- Tandas ya registradas en esta orden -->
        @if (datos.registros_horno.length > 0) {
          <div class="mt-5 rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <p class="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Tandas ya registradas ({{ datos.registros_horno.length }})
            </p>
            <ul class="mt-2 space-y-1">
              @for (registro of datos.registros_horno; track registro.id) {
                <li class="flex items-center justify-between gap-3 text-sm">
                  <span class="font-semibold text-slate-700">
                    {{ registro.cantidad_bultos | number: '1.0-2' }} bultos
                  </span>
                  <span class="font-medium text-slate-500">
                    {{ registro.kg_crudos_calculados | number: '1.0-0' }} kg crudos
                  </span>
                </li>
              }
            </ul>
          </div>
        }
      }
    </div>
  `,
})
export class HornoAsistentePage {
  readonly id = input.required<string>();

  private readonly ordenes = inject(OrdenesService);
  private readonly catalogos = inject(CatalogosService);
  private readonly avisos = inject(NotificacionesService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly detalle = signal<DetalleOrden | null>(null);
  protected readonly tiposDesperdicio = signal<ItemCatalogo[]>([]);
  /** Peso estándar del bulto, para mostrar el equivalente en kg. */
  protected readonly pesoBulto = signal(0);

  // --- Datos de la tanda ---------------------------------------------------

  /** Momento en que arranca la tanda. Se toma solo al abrir el registro. */
  private readonly inicio = signal<Date>(new Date());

  protected readonly bultos = signal('0');
  /**
   * Una tanda de horno se carga con 30 a 55 bultos de papa cruda. Se ofrecen
   * todos los valores del rango para que el operario toque uno y siga: es la
   * cantidad que registra siempre. Para algo fuera de ese rango (una tanda
   * corta, una prueba) queda el teclado numérico a un toque.
   */
  protected readonly tecladoBultosAbierto = signal(false);
  protected readonly temperatura = signal('0');
  /** Igual que los bultos: el rango habitual de un toque, el teclado al lado. */
  protected readonly tecladoTemperaturaAbierto = signal(false);
  protected readonly operariosSeleccion = signal(0);
  protected readonly operariosZonaHumeda = signal(0);
  protected readonly aceiteInicial = signal('0');
  protected readonly aceiteFinal = signal('0');
  protected readonly hayDesperdicio = signal(false);
  protected readonly tipoDesperdicioId = signal<number | null>(null);
  protected readonly cantidadDesperdicio = signal('0');

  protected readonly indicePaso = signal(0);

  /** Minutos que se puede atrasar el inicio si la tanda empezó antes. */
  protected readonly ajustes = [15, 30, 60];
  /** La zona húmeda se opera entre 3 y 5 personas. */
  protected readonly personalZonaHumeda = [3, 4, 5];
  /** La selección de papa freída, entre 4 y 8. */
  protected readonly personalSeleccion = [4, 5, 6, 7, 8];
  /** 165, 166... 190 °C: el rango de trabajo del aceite de freído. */
  protected readonly temperaturasComunes = Array.from({ length: 26 }, (_, i) => String(165 + i));
  /** 30, 31, 32... 55: el rango completo de bultos de una tanda. */
  protected readonly bultosComunes = Array.from({ length: 26 }, (_, i) => String(30 + i));

  private readonly pasos: PasoTanda[] = [
    'horario',
    'bultos',
    'temperatura',
    'personal_zona_humeda',
    'personal_seleccion',
    'aceite_inicial',
    'aceite_final',
    'desperdicio',
    'resumen',
  ];

  protected readonly totalPasos = computed(() => this.pasos.length);
  protected readonly pasoActual = computed<PasoTanda>(() => this.pasos[this.indicePaso()]);
  protected readonly progreso = computed(() => ((this.indicePaso() + 1) / this.totalPasos()) * 100);

  private readonly textos: Record<PasoTanda, { etiqueta: string; titulo: string; sub: string }> = {
    horario: {
      etiqueta: 'Horario',
      titulo: 'Esta es la hora de tu tanda',
      sub: 'Se toma automáticamente. Cada tanda dura una hora.',
    },
    bultos: { etiqueta: 'Materia prima', titulo: '¿Cuántos bultos entraron?', sub: 'Papa cruda que alimentó el horno.' },
    temperatura: { etiqueta: 'Proceso', titulo: '¿A qué temperatura está el aceite?', sub: '' },
    personal_zona_humeda: {
      etiqueta: 'Personal',
      titulo: '¿Cuántos operarios en zona húmeda?',
      sub: 'Toca el número de personas que trabajaron en el área.',
    },
    personal_seleccion: {
      etiqueta: 'Personal',
      titulo: '¿Cuántos operarios en selección?',
      sub: 'Personas seleccionando la papa ya freída.',
    },
    aceite_inicial: { etiqueta: 'Aceite', titulo: '¿Nivel inicial del aceite?', sub: 'Medida en centímetros antes de la tanda.' },
    aceite_final: { etiqueta: 'Aceite', titulo: '¿Nivel final del aceite?', sub: 'Medida en centímetros al terminar.' },
    desperdicio: { etiqueta: 'Desperdicio', titulo: '¿Hubo desperdicio?', sub: '' },
    resumen: { etiqueta: 'Confirmación', titulo: 'Revisa y guarda', sub: 'Verifica antes de registrar la tanda.' },
  };

  protected readonly etiquetaPaso = computed(() => this.textos[this.pasoActual()].etiqueta);
  protected readonly tituloPaso = computed(() => this.textos[this.pasoActual()].titulo);
  protected readonly subtituloPaso = computed(() => this.textos[this.pasoActual()].sub);

  /** Hora de inicio en formato de reloj (HH:MM). */
  protected readonly horaInicio = computed(() => this.aHHMM(this.inicio()));

  /** Fin = inicio + 1 hora. Cada tanda del horno dura una hora. */
  protected readonly fin = computed(() => new Date(this.inicio().getTime() + 60 * 60 * 1000));
  protected readonly horaFin = computed(() => this.aHHMM(this.fin()));

  protected readonly consumoCm = computed(() => {
    const ini = this.numero(this.aceiteInicial());
    const fin = this.numero(this.aceiteFinal());
    if (ini <= 0) {
      return null;
    }
    return Math.round((ini - fin) * 100) / 100;
  });

  protected readonly nombreDesperdicio = computed(
    () => this.tiposDesperdicio().find((t) => t.id === this.tipoDesperdicioId())?.nombre ?? '',
  );

  protected readonly pasoValido = computed(() => {
    switch (this.pasoActual()) {
      case 'horario':
        return true;
      case 'bultos':
        return this.numero(this.bultos()) > 0;
      case 'temperatura':
        return this.numero(this.temperatura()) > 0;
      // Se elige entre botones: hay que tocar una opción para seguir.
      case 'personal_zona_humeda':
        return this.operariosZonaHumeda() > 0;
      case 'personal_seleccion':
        return this.operariosSeleccion() > 0;
      case 'aceite_inicial':
        return this.numero(this.aceiteInicial()) > 0;
      case 'aceite_final':
        // El nivel final nunca puede ser mayor que el inicial.
        return this.numero(this.aceiteFinal()) >= 0 && (this.consumoCm() ?? -1) >= 0;
      case 'desperdicio':
        // Si dijo que hubo, necesita tipo y cantidad.
        return (
          !this.hayDesperdicio() ||
          (this.tipoDesperdicioId() !== null && this.numero(this.cantidadDesperdicio()) > 0)
        );
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
      tipos: this.catalogos.listarTiposDesperdicio(true),
      configuracion: this.catalogos.verConfiguracion(),
    }).subscribe({
      next: ({ detalle, tipos, configuracion }) => {
        this.detalle.set(detalle);
        this.tiposDesperdicio.set(tipos);
        this.pesoBulto.set(Number(configuracion.peso_estandar_bulto_kg ?? 0));
        // El reloj de la tanda arranca al abrir el registro.
        this.inicio.set(new Date());
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  // --- Utilidades ----------------------------------------------------------

  protected numero(texto: string): number {
    const n = Number(texto);
    return Number.isFinite(n) ? n : 0;
  }

  /** Cambia entre las cantidades habituales (30-55) y el teclado numérico. */
  protected alternarTecladoBultos(): void {
    this.tecladoBultosAbierto.update((abierto) => !abierto);
  }

  /** Cambia entre las temperaturas habituales (165-190 °C) y el teclado. */
  protected alternarTecladoTemperatura(): void {
    this.tecladoTemperaturaAbierto.update((abierto) => !abierto);
  }

  private aHHMM(fecha: Date): string {
    return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
  }

  /** Corre el inicio hacia atrás si la tanda ya llevaba rato andando. */
  protected atrasarInicio(minutos: number): void {
    this.inicio.update((f) => new Date(f.getTime() - minutos * 60 * 1000));
  }

  protected reiniciarHora(): void {
    this.inicio.set(new Date());
  }

  protected quitarDesperdicio(): void {
    this.hayDesperdicio.set(false);
    this.tipoDesperdicioId.set(null);
    this.cantidadDesperdicio.set('0');
  }

  // --- Estilos -------------------------------------------------------------

  protected claseAtajo(activo: boolean): string {
    const base =
      'rounded-full border px-4 py-2 text-sm font-bold shadow-2xs transition active:scale-95';
    return activo
      ? `${base} border-marca-500 bg-marca-600 text-white`
      : `${base} border-slate-200 bg-white text-slate-700 hover:border-marca-400 hover:bg-marca-50`;
  }

  /**
   * Tecla de valor predefinido (bultos, temperatura). Mismo tamaño y forma
   * que las del teclado numérico (h-14, esquinas redondeadas) para que se
   * lean como un solo teclado, con ancho fijo para que las filas queden
   * parejas. El tamaño del texto se pasa aparte porque "45" y "165" no piden
   * el mismo cuerpo de letra.
   */
  protected claseValor(activo: boolean, tamano: string): string {
    const base =
      `flex h-14 w-16 shrink-0 items-center justify-center rounded-2xl border ${tamano} font-extrabold ` +
      'tabular-nums shadow-2xs transition active:scale-95';
    return `${base} ${this.colorTecla(activo)}`;
  }

  /**
   * Tecla grande, para los pasos con pocas opciones (el personal de cada
   * área). Al haber solo tres o cinco números, la pantalla los puede mostrar
   * más grandes: se tocan mejor con guantes y llenan el espacio.
   */
  protected claseValorGrande(activo: boolean): string {
    const base =
      'flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border-2 text-4xl font-extrabold ' +
      'tabular-nums shadow-2xs transition active:scale-95';
    return `${base} ${this.colorTecla(activo)}`;
  }

  /** Colores de una tecla de valor, según esté elegida o no. */
  private colorTecla(activo: boolean): string {
    return activo
      ? 'border-marca-500 bg-marca-600 text-white'
      : 'border-slate-200 bg-white text-slate-700 hover:border-marca-400 hover:bg-marca-50 hover:text-marca-800';
  }


  protected claseTarjetaGrande(seleccionada: boolean): string {
    const base =
      'relative flex flex-col items-center gap-1.5 rounded-3xl border-2 px-4 py-7 text-center transition-all ' +
      'duration-150 active:scale-[0.98]';
    return seleccionada
      ? `${base} border-marca-500 bg-marca-50/70 shadow-lg ring-4 ring-marca-500/10`
      : `${base} border-slate-200 bg-white hover:border-marca-300 hover:bg-marca-50/30 hover:shadow-md`;
  }

  protected claseFila(seleccionada: boolean): string {
    const base =
      'flex w-full items-center gap-3.5 rounded-2xl border-2 px-4 py-3.5 text-left transition-all duration-150 active:scale-[0.99]';
    return seleccionada
      ? `${base} border-marca-500 bg-marca-50/70 shadow-sm ring-4 ring-marca-500/10`
      : `${base} border-slate-200 bg-white hover:border-marca-300 hover:bg-marca-50/30`;
  }

  // --- Navegación ----------------------------------------------------------

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

  protected guardar(): void {
    const conDesperdicio =
      this.tipoDesperdicioId() !== null && this.numero(this.cantidadDesperdicio()) > 0;

    const datos: RegistroHornoGuardar = {
      hora_inicio: this.horaInicio(),
      hora_fin: this.horaFin(),
      cantidad_bultos: this.numero(this.bultos()),
      operarios_seleccion: this.operariosSeleccion(),
      operarios_horno: this.operariosZonaHumeda(),
      nivel_aceite_inicial_cm: this.numero(this.aceiteInicial()),
      nivel_aceite_final_cm: this.numero(this.aceiteFinal()),
      temperatura_aceite_c: this.numero(this.temperatura()),
      observaciones: null,
      tipo_desperdicio_id: conDesperdicio ? this.tipoDesperdicioId() : null,
      cantidad_desperdicio_kg: conDesperdicio ? this.numero(this.cantidadDesperdicio()) : null,
      observacion_desperdicio: null,
    };

    this.enviando.set(true);
    this.ordenes.crearRegistroHorno(Number(this.id()), datos).subscribe({
      next: (registro) => {
        this.enviando.set(false);
        this.avisos.exito(
          `Tanda registrada: ${registro.kg_crudos_calculados} kg de papa cruda.`,
        );
        void this.router.navigate(['/horno']);
      },
      error: () => this.enviando.set(false),
    });
  }
}
