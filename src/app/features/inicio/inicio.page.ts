import { DatePipe, DecimalPipe, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { RouterLink } from '@angular/router';

import type { ReferenciaPapa } from '../../core/modelos/bodega.model';
import type { TotalesOrden, Orden } from '../../core/modelos/produccion.model';
import { AnaliticaService } from '../../core/servicios/analitica.service';
import { AuthService } from '../../core/servicios/auth.service';
import { BodegaService } from '../../core/servicios/bodega.service';
import type { Notificacion } from '../../core/modelos/notificacion.model';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { NotificacionesPlantaService } from '../../core/servicios/notificaciones-planta.service';
import { OrdenesService } from '../../core/servicios/ordenes.service';
import { CargandoComponent } from '../../ui/cargando.component';
import { EstadoVacioComponent } from '../../ui/estado-vacio.component';
import { EtiquetaEstadoComponent } from '../../ui/etiqueta-estado.component';
import { TarjetaComponent } from '../../ui/tarjeta.component';

@Component({
  selector: 'app-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TarjetaComponent,
    CargandoComponent,
    EstadoVacioComponent,
    EtiquetaEstadoComponent,
    DecimalPipe,
    DatePipe,
  ],
  templateUrl: './inicio.page.html',
})
export class InicioPage {
  private readonly analitica = inject(AnaliticaService);
  private readonly documento = inject(DOCUMENT);
  protected readonly descargandoInforme = signal(false);
  protected readonly errorInforme = signal(false);
  private readonly ordenes = inject(OrdenesService);
  private readonly bodega = inject(BodegaService);
  private readonly catalogos = inject(CatalogosService);
  private readonly avisos = inject(NotificacionesPlantaService);
  private readonly destruccion = inject(DestroyRef);
  protected readonly totales = signal<
    Record<number, Pick<TotalesOrden, 'kg_papa_frita' | 'avance_porcentaje'>>
  >({});
  protected readonly kgRecibidos = computed(() => {
    const ordenes = this.enProduccion();
    const totales = this.totales();
    if (ordenes.some((orden) => !totales[orden.id])) return null;
    return ordenes.reduce((suma, orden) => suma + Number(totales[orden.id]?.kg_papa_frita ?? 0), 0);
  });
  protected readonly sinFormula = signal<number | null>(null);
  protected readonly sinDensidad = signal<string[] | null>(null);
  protected readonly actividad = signal<Notificacion[] | null>(null);
  protected readonly auth = inject(AuthService);

  protected readonly cargando = signal(true);
  protected readonly falloCarga = signal(false);
  protected readonly gestionaOrdenes = computed(() =>
    ['admin', 'supervisor'].includes(this.auth.rol() ?? ''),
  );
  protected readonly enProduccion = signal<Orden[]>([]);
  protected readonly referenciasBodega = signal<ReferenciaPapa[]>([]);

  protected readonly totalKgProgramados = computed(() =>
    this.enProduccion().reduce((acc, ord) => acc + (Number(ord.cantidad_programada) || 0), 0),
  );

  protected readonly referenciasActivas = computed(() =>
    this.referenciasBodega().filter((referencia) => referencia.activo),
  );

  protected readonly pesoPromedioReferencias = computed(() => {
    const activas = this.referenciasActivas();
    if (activas.length === 0) {
      return 0;
    }
    const total = activas.reduce(
      (acc, referencia) => acc + Number(referencia.peso_promedio_bulto_kg),
      0,
    );
    return total / activas.length;
  });

  constructor() {
    this.cargarResumen();
    this.avisos
      .historial()
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: (avisos) => this.actividad.set(avisos.slice(0, 4)),
        error: () => this.actividad.set(null),
      });
    if (this.auth.rol() === 'admin') {
      this.catalogos
        .densidadesVigentes()
        .pipe(takeUntilDestroyed(this.destruccion))
        .subscribe({
          next: (densidades) =>
            this.sinDensidad.set(
              densidades.filter((d) => d.densidad_kg_por_litro == null).map((d) => d.horno_nombre),
            ),
          error: () => this.sinDensidad.set(null),
        });
    }
  }

  protected cargarResumen(): void {
    this.cargando.set(true);
    this.falloCarga.set(false);
    if (this.auth.esBodeguero()) {
      this.bodega
        .listar(false, true)
        .pipe(takeUntilDestroyed(this.destruccion))
        .subscribe({
          next: (referencias) => {
            this.referenciasBodega.set(referencias);
            this.cargando.set(false);
          },
          error: () => this.mostrarError(),
        });
      return;
    }

    this.ordenes
      .resumenInicio()
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: ({ activas, pendientes_sin_formula }) => {
          this.enProduccion.set(activas.map(({ orden }) => orden));
          this.totales.set(
            Object.fromEntries(activas.map(({ orden, avance }) => [orden.id, avance])),
          );
          this.sinFormula.set(pendientes_sin_formula);
          this.cargando.set(false);
        },
        error: () => this.mostrarError(),
      });
  }

  private mostrarError(): void {
    this.falloCarga.set(true);
    this.cargando.set(false);
  }

  protected descargarInformeDiario(): void {
    if (this.auth.rol() !== 'admin' || this.descargandoInforme()) return;

    this.descargandoInforme.set(true);
    this.errorInforme.set(false);

    this.analitica
      .informeDiario()
      .pipe(
        takeUntilDestroyed(this.destruccion),
        finalize(() => this.descargandoInforme.set(false)),
      )
      .subscribe({
        next: ({ body, headers }) => {
          if (!body?.size) {
            this.errorInforme.set(true);
            return;
          }
          const url = URL.createObjectURL(body);
          const enlace = this.documento.createElement('a');
          enlace.href = url;
          const nombre = headers
            .get('Content-Disposition')
            ?.match(/datacontrol_informe_diario_\d{4}-\d{2}-\d{2}\.xlsx/)?.[0];
          enlace.download = nombre ?? 'datacontrol_informe_diario.xlsx';
          enlace.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
        error: () => this.errorInforme.set(true),
      });
  }
}
