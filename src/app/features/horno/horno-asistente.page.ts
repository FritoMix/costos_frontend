import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { PasoMezclaHornoComponent } from './asistente/paso-mezcla.component';
import { PasoResumenHornoComponent } from './asistente/paso-resumen.component';
import { cambiarBultosMezcla } from './asistente/proyeccion-mezcla';
import { PasoHorarioHornoComponent } from './asistente/paso-horario.component';
import { PasoPersonalHornoComponent } from './asistente/paso-personal.component';
import { PasoAceiteHornoComponent } from './asistente/paso-aceite.component';
import { PasoParadaHornoComponent } from './asistente/paso-parada.component';
import { pasosDeTanda, type PasoTanda, TEXTOS_PASOS_HORNO } from './asistente/pasos-tanda';
import { colorTecla } from './asistente/presentacion-tanda';
import { consumoAceiteCm, numeroDeTexto, pasoTandaValido } from './asistente/reglas-tanda';
import { construirRegistroHorno } from './asistente/solicitud-tanda';
import type { DatosTandaHorno, FilaMezclaTanda } from './asistente/reglas-tanda';

import { seguirCambios } from '../../core/guards/cambios.guard';

import type { ReferenciaPapa } from '../../core/modelos/bodega.model';
import type { ItemCatalogo } from '../../core/modelos/catalogos.model';
import type { DetalleOrden } from '../../core/modelos/produccion.model';
import { BodegaService } from '../../core/servicios/bodega.service';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import {
  calcularKgCrudosPreview,
  calcularKgFritosPreview,
} from '../../core/utilidades/calculos-produccion';
import {
  formatearMinutos,
  minutosDisponibles as calcularMinutosDisponibles,
} from '../../core/utilidades/limites-produccion';
import { OrdenesService } from '../../core/servicios/ordenes.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { TecladoNumericoComponent } from '../../ui/teclado-numerico.component';

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
  host: { '[attr.inert]': 'enviando() ? "" : null' },
  imports: [
    PasoMezclaHornoComponent,
    PasoResumenHornoComponent,
    PasoHorarioHornoComponent,
    PasoPersonalHornoComponent,
    PasoAceiteHornoComponent,
    PasoParadaHornoComponent,
    RouterLink,
    DecimalPipe,
    BotonComponent,
    CargandoComponent,
    TecladoNumericoComponent,
  ],
  templateUrl: './horno-asistente.page.html',
})
export class HornoAsistentePage {
  readonly id = input.required<string>();

  private readonly ordenes = inject(OrdenesService);
  private readonly catalogos = inject(CatalogosService);
  private readonly bodega = inject(BodegaService);
  private readonly avisos = inject(NotificacionesService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly detalle = signal<DetalleOrden | null>(null);
  protected readonly tiposDesperdicio = signal<ItemCatalogo[]>([]);
  protected readonly referenciasPapa = signal<ReferenciaPapa[]>([]);
  protected readonly referenciaPapaId = signal<number | null>(null);

  /** Fila de la mezcla que el operario ajusta en la tanda. */
  protected readonly mezcla = signal<FilaMezclaTanda[]>([]);

  protected readonly referenciasDisponibles = computed(() =>
    this.referenciasPapa().filter((r) => r.activo),
  );
  protected readonly referenciaSeleccionada = computed(
    () => this.referenciasPapa().find((r) => r.id === this.referenciaPapaId()) ?? null,
  );
  /** Peso promedio de la referencia elegida, para mostrar el equivalente en kg. */
  protected readonly pesoBulto = computed(() =>
    Number(this.referenciaSeleccionada()?.peso_promedio_bulto_kg ?? 0),
  );
  protected readonly kgCrudos = computed(() =>
    calcularKgCrudosPreview(this.numero(this.bultos()), this.pesoBulto()),
  );
  protected readonly kgFritos = computed(() =>
    calcularKgFritosPreview(
      this.kgCrudos(),
      this.referenciaSeleccionada()?.rendimiento_fritura_pct,
    ),
  );

  /** ¿La orden trabaja con la fórmula multi-referencia de Bodega? */
  protected readonly hayFormula = computed(
    () => (this.detalle()?.formula?.referencias.length ?? 0) > 0,
  );
  protected readonly formula = computed(() => this.detalle()?.formula ?? null);
  /** Una orden nueva sin fórmula no puede registrar tandas. */
  protected readonly bloqueadaPorFormula = computed(() => {
    const orden = this.detalle()?.orden;
    return (
      !!orden &&
      orden.formula_obligatoria &&
      orden.formula_estado === 'sin_formula' &&
      !this.hayFormula()
    );
  });
  protected readonly capacidadMezcla = computed(() =>
    Number(this.formula()?.capacidad_bultos_hora ?? Infinity),
  );
  protected readonly mezclaCompleta = computed(
    () => this.hayFormula() && this.mezcla().every((fila) => fila.restante <= 0),
  );

  /** Minutos que le quedan a la orden para registrar tandas de una hora. */
  protected readonly minutosDisponibles = computed(() => {
    const datos = this.detalle();
    return datos
      ? calcularMinutosDisponibles(datos.orden.horas_produccion, datos.registros_horno)
      : null;
  });
  protected readonly textoMinutosDisponibles = computed(() => {
    const minutos = this.minutosDisponibles();
    return minutos === null ? null : formatearMinutos(minutos);
  });
  protected readonly ordenCompleta = computed(() => {
    const minutos = this.minutosDisponibles();
    return minutos !== null && minutos < 60;
  });

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
  protected readonly aceiteAgregado = signal('0');
  protected readonly hayDesperdicio = signal(false);
  protected readonly tipoDesperdicioId = signal<number | null>(null);
  protected readonly cantidadDesperdicio = signal('0');
  /** Parada dentro de la hora (V17). null = aún no contesta. */
  protected readonly hayParada = signal<boolean | null>(null);
  protected readonly minutosParada = signal(0);
  protected readonly causaParada = signal<string | null>(null);
  protected readonly notaParada = signal('');

  /** V17: cada hora programada es una tanda; se llena la primera libre. */
  protected readonly numeroTanda = computed(() => {
    const datos = this.detalle();
    if (!datos) return null;
    const ocupadas = new Set(datos.registros_horno.map((r) => r.numero_tanda).filter((n) => !!n));
    const horas = datos.orden.horas_produccion ?? ocupadas.size + 1;
    for (let n = 1; n <= horas; n++) if (!ocupadas.has(n)) return n;
    return null;
  });

  /** Hora de la tanda puesta por la app: inicio de la orden + (n − 1) horas. */
  protected readonly franjaAutomatica = computed(() => {
    const inicioOrden = this.detalle()?.orden.hora_inicio;
    const n = this.numeroTanda();
    if (!inicioOrden || !n) return null;
    const inicio = new Date(new Date(inicioOrden).getTime() + (n - 1) * 60 * 60 * 1000);
    return { inicio, fin: new Date(inicio.getTime() + 60 * 60 * 1000) };
  });

  /** "08:00" si la hora de esta tanda todavía no empieza (5 min de margen). */
  protected readonly horaFutura = computed(() => {
    const franja = this.franjaAutomatica();
    if (!franja || franja.inicio.getTime() - 5 * 60 * 1000 <= Date.now()) return null;
    return this.aHHMM(franja.inicio);
  });

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

  private readonly pasos = computed(() => pasosDeTanda(this.hayFormula()));

  protected readonly totalPasos = computed(() => this.pasos().length);
  protected readonly pasoActual = computed<PasoTanda>(() => this.pasos()[this.indicePaso()]);
  protected readonly progreso = computed(() => ((this.indicePaso() + 1) / this.totalPasos()) * 100);

  protected readonly etiquetaPaso = computed(() => TEXTOS_PASOS_HORNO[this.pasoActual()].etiqueta);
  protected readonly tituloPaso = computed(() => TEXTOS_PASOS_HORNO[this.pasoActual()].titulo);
  protected readonly subtituloPaso = computed(() => TEXTOS_PASOS_HORNO[this.pasoActual()].sub);

  /** Hora de inicio en formato de reloj (HH:MM). */
  protected readonly horaInicio = computed(() =>
    this.aHHMM(this.franjaAutomatica()?.inicio ?? this.inicio()),
  );

  /** Fin = inicio + 1 hora. Cada tanda del horno dura una hora. */
  protected readonly fin = computed(
    () => this.franjaAutomatica()?.fin ?? new Date(this.inicio().getTime() + 60 * 60 * 1000),
  );
  protected readonly horaFin = computed(() => this.aHHMM(this.fin()));

  protected readonly consumoCm = computed(() =>
    consumoAceiteCm(this.aceiteInicial(), this.aceiteFinal()),
  );

  protected readonly nombreDesperdicio = computed(
    () => this.tiposDesperdicio().find((t) => t.id === this.tipoDesperdicioId())?.nombre ?? '',
  );

  protected readonly datosTanda = computed<DatosTandaHorno>(() => ({
    conFormula: this.hayFormula(),
    referenciaPapaId: this.referenciaPapaId(),
    mezcla: this.mezcla(),
    bultos: this.bultos(),
    temperatura: this.temperatura(),
    operariosSeleccion: this.operariosSeleccion(),
    operariosZonaHumeda: this.operariosZonaHumeda(),
    aceiteInicial: this.aceiteInicial(),
    aceiteFinal: this.aceiteFinal(),
    aceiteAgregado: this.aceiteAgregado(),
    hayDesperdicio: this.hayDesperdicio(),
    tipoDesperdicioId: this.tipoDesperdicioId(),
    cantidadDesperdicio: this.cantidadDesperdicio(),
    hayParada: this.hayParada(),
    minutosParada: this.minutosParada(),
    causaParada: this.causaParada(),
    notaParada: this.notaParada(),
  }));
  protected readonly pasoValido = computed(() =>
    pasoTandaValido(this.pasoActual(), this.datosTanda(), this.capacidadMezcla()),
  );

  private readonly proteccion = seguirCambios(
    () => [
      this.inicio().getTime(),
      this.referenciaPapaId(),
      this.mezcla().map((fila) => [fila.referencia_id, fila.bultos]),
      this.bultos(),
      this.temperatura(),
      this.operariosSeleccion(),
      this.operariosZonaHumeda(),
      this.aceiteInicial(),
      this.aceiteFinal(),
      this.aceiteAgregado(),
      this.hayDesperdicio(),
      this.tipoDesperdicioId(),
      this.cantidadDesperdicio(),
      this.hayParada(),
      this.minutosParada(),
      this.causaParada(),
      this.notaParada(),
    ],
    () => this.enviando(),
  );

  operacionPendiente(): boolean {
    return this.proteccion.ocupado();
  }

  cambiosPendientes(): boolean {
    return this.proteccion.pendientes();
  }

  constructor() {
    queueMicrotask(() => this.cargar());
  }

  private cargar(): void {
    forkJoin({
      detalle: this.ordenes.detalle(Number(this.id())),
      tipos: this.catalogos.listarTiposDesperdicio(true),
      referencias: this.bodega.listar(true, true),
    }).subscribe({
      next: ({ detalle, tipos, referencias }) => {
        this.detalle.set(detalle);
        this.tiposDesperdicio.set(tipos);
        this.referenciasPapa.set(referencias);
        // Tanda con fórmula: se precarga la mezcla con min(plan, restante).
        // El operario puede ajustar los bultos dentro del restante.
        this.mezcla.set(
          (detalle.formula?.referencias ?? []).map((fila) => {
            const restante = Number(fila.bultos_restantes);
            return {
              referencia_id: fila.referencia_id,
              nombre: fila.nombre,
              bultos_por_tanda: fila.bultos_por_tanda,
              producido: Number(fila.bultos_producidos),
              restante,
              peso_promedio_bulto_kg: Number(fila.peso_promedio_bulto_kg),
              rendimiento_fritura_pct: Number(fila.rendimiento_fritura_pct),
              bultos: Math.max(0, Math.min(fila.bultos_por_tanda, restante)),
            };
          }),
        );
        // Si solo hay una referencia activa, se deja elegida para ahorrar
        // un toque; el operario igual la ve en el resumen antes de guardar.
        if (this.referenciasDisponibles().length === 1) {
          this.referenciaPapaId.set(this.referenciasDisponibles()[0].id);
        }
        // El reloj de la tanda arranca al abrir el registro.
        this.inicio.set(new Date());
        this.proteccion.aceptar();
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  /** Fija los bultos de una fila respetando el restante planificado. */
  protected fijarBultos(indice: number, bultos: number | string | null): void {
    this.mezcla.update((filas) => cambiarBultosMezcla(filas, indice, bultos));
  }

  // --- Utilidades ----------------------------------------------------------

  protected numero(texto: string): number {
    return numeroDeTexto(texto);
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
    return `${base} ${colorTecla(activo)}`;
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
    if (this.enviando()) {
      return;
    }
    if (this.ordenCompleta()) {
      this.avisos.error('No queda tiempo suficiente para otra tanda de una hora.');
      return;
    }
    if (this.hayFormula() && this.mezclaCompleta()) {
      this.avisos.error(
        'La fórmula de esta orden ya se cumplió: no se puede registrar otra tanda.',
      );
      return;
    }

    const datos = construirRegistroHorno(
      this.datosTanda(),
      { inicio: this.horaInicio(), fin: this.horaFin() },
      this.numeroTanda(),
    );

    this.enviando.set(true);
    this.ordenes.crearRegistroHorno(Number(this.id()), datos).subscribe({
      next: (registro) => {
        this.proteccion.aceptar();
        this.enviando.set(false);
        this.avisos.exito(`Tanda registrada: ${registro.kg_crudos_calculados} kg de papa cruda.`);
        void this.router.navigate(['/horno']);
      },
      error: () => this.enviando.set(false),
    });
  }
}
