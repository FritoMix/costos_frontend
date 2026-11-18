import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, from, map, mergeMap, of, toArray } from 'rxjs';
import { RouterLink } from '@angular/router';

import type { ReferenciaPapa } from '../../core/modelos/bodega.model';
import type { TotalesOrden, Orden } from '../../core/modelos/produccion.model';
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

interface AccesoRapido {
  ruta: string;
  titulo: string;
  descripcion: string;
}

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
  private readonly ordenes = inject(OrdenesService);
  private readonly bodega = inject(BodegaService);
  private readonly catalogos = inject(CatalogosService);
  private readonly avisos = inject(NotificacionesPlantaService);
  private readonly destruccion = inject(DestroyRef);
  protected readonly totales = signal<Record<number, TotalesOrden | null>>({});
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

    this.totales.set({});
    if (this.gestionaOrdenes()) {
      this.ordenes
        .listar({ estado: 'pendiente' })
        .pipe(takeUntilDestroyed(this.destruccion))
        .subscribe({
          next: (ordenes) =>
            this.sinFormula.set(
              ordenes.filter(
                (orden) => orden.formula_obligatoria && orden.formula_estado === 'sin_formula',
              ).length,
            ),
          error: () => this.sinFormula.set(null),
        });
    }
    this.ordenes
      .listar({ estado: 'en_produccion', soloPropias: false })
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: (ordenes) => {
          this.enProduccion.set(ordenes);
          from(ordenes)
            .pipe(
              mergeMap(
                (orden) =>
                  this.ordenes.detalle(orden.id).pipe(
                    map((detalle) => [orden.id, detalle.totales] as const),
                    catchError(() => of([orden.id, null] as const)),
                  ),
                4,
              ),
              toArray(),
              takeUntilDestroyed(this.destruccion),
            )
            .subscribe((totales) => this.totales.set(Object.fromEntries(totales)));
          this.cargando.set(false);
        },
        error: () => this.mostrarError(),
      });
  }

  private mostrarError(): void {
    this.falloCarga.set(true);
    this.cargando.set(false);
  }

  protected accesos(): AccesoRapido[] {
    switch (this.auth.rol()) {
      case 'supervisor':
        return [
          {
            ruta: '/ordenes/nueva',
            titulo: 'Nueva Orden',
            descripcion: 'Crear y programar una orden de producción con lotes de producto.',
          },
          {
            ruta: '/ordenes',
            titulo: 'Mis Órdenes',
            descripcion: 'Iniciar, finalizar, corregir o consultar el estado de tus órdenes.',
          },
          {
            ruta: '/bodega',
            titulo: 'Bodega de Papa',
            descripcion:
              'Parámetros productivos de las referencias y proyección de kg crudos/fritos.',
          },
          {
            ruta: '/hornos',
            titulo: 'Capacidad de Hornos',
            descripcion: 'Configura los bultos por hora que puede procesar cada horno.',
          },
        ];
      case 'operario_horno':
        return [
          {
            ruta: '/horno',
            titulo: 'Registrar Tanda en Horno',
            descripcion: 'Registrar bultos de papa, aceite consumido, temperatura y desperdicio.',
          },
        ];
      case 'bodeguero':
        return [
          {
            ruta: '/formula-produccion',
            titulo: 'Fórmula de producción',
            descripcion: 'Define la mezcla de papa de cada orden pendiente y sigue su avance.',
          },
          {
            ruta: '/bodega',
            titulo: 'Referencias de Papa',
            descripcion:
              'Crear variedades de papa, su rendimiento, participación y peso por bulto.',
          },
        ];
      case 'operario_saborizado':
        return [
          {
            ruta: '/saborizado',
            titulo: 'Registrar Recepción y Sabor',
            descripcion: 'Pesar canastilla por canastilla y registrar adición de saborizante.',
          },
        ];
      default:
        return [
          {
            ruta: '/bodega',
            titulo: 'Bodega de Papa',
            descripcion: 'Referencias de papa, parámetros productivos y proyección de producción.',
          },
          {
            ruta: '/formula-produccion',
            titulo: 'Fórmula de producción',
            descripcion: 'Mezcla de papa por orden, proyección de kg y avance de bultos.',
          },
          {
            ruta: '/hornos',
            titulo: 'Capacidad de Hornos',
            descripcion: 'Configura los bultos por hora que puede procesar cada horno.',
          },
          {
            ruta: '/analisis',
            titulo: 'Métricas & Análisis KPI',
            descripcion: 'Indicadores por categoría, rendimientos de aceite y exportación Excel.',
          },
          {
            ruta: '/ordenes',
            titulo: 'Gestión de Órdenes',
            descripcion: 'Listado completo de órdenes programadas, en curso y finalizadas.',
          },
          {
            ruta: '/catalogos',
            titulo: 'Catálogos Maestros',
            descripcion: 'Configuración de productos, hornos, turnos y densidades.',
          },
        ];
    }
  }
}
