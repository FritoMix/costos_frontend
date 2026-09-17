import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import type { Horno, ItemCatalogo, Producto, Turno } from '../../core/modelos/catalogos.model';
import type { Usuario } from '../../core/modelos/identidad.model';
import type {
  FilaBache,
  FiltrosAnalisis,
  Indicadores,
  IndicadoresCategoria,
} from '../../core/modelos/analitica.model';
import { AnaliticaService } from '../../core/servicios/analitica.service';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { GraficaBarrasComponent } from '../../ui/grafica-barras.component';
import { IndicadorComponent } from '../../ui/indicador.component';
import { TarjetaComponent } from '../../ui/tarjeta.component';

/**
 * Pantalla de Análisis & KPI: Indicadores de planta con filtros espaciados,
 * balance de masa, métricas de eficiencia operativa, gráficas y detalle tanda a tanda.
 */
@Component({
  selector: 'app-analisis',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
    TarjetaComponent,
    BotonComponent,
    CargandoComponent,
    IndicadorComponent,
    GraficaBarrasComponent,
  ],
  template: `
    <div class="space-y-8">
      <!-- Encabezado Principal Espacioso -->
      <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-marca-500"></span>
            <span class="text-xs font-bold uppercase tracking-widest text-slate-400">Reportes & Eficiencia</span>
          </div>
          <h1 class="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Métricas & Análisis KPI</h1>
          <p class="mt-1 text-sm text-slate-500 font-medium max-w-2xl leading-relaxed">
            Indicadores de rendimiento, balance de masa, absorción de aceite y mermas calculados sobre datos consolidados de planta.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <app-boton variante="secundario" (click)="exportar('csv')">
            <span class="flex items-center gap-2">
              <svg class="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Descargar CSV
            </span>
          </app-boton>
          <app-boton variante="acento" (click)="exportar('xlsx')">
            <span class="flex items-center gap-2">
              <svg class="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Excel (.xlsx)
            </span>
          </app-boton>
        </div>
      </header>

      <!-- Filtros de Consulta con Espaciado Cómodo -->
      <app-tarjeta
        titulo="Filtros de Búsqueda y Segmentación"
        subtitulo="Personaliza el período y las líneas operativas para calcular los indicadores"
      >
        <form [formGroup]="formulario" class="space-y-6">
          <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label class="etiqueta" for="desde">Fecha Desde</label>
              <input id="desde" type="date" class="campo" formControlName="fecha_desde" />
            </div>
            <div>
              <label class="etiqueta" for="hasta">Fecha Hasta</label>
              <input id="hasta" type="date" class="campo" formControlName="fecha_hasta" />
            </div>
            <div>
              <label class="etiqueta" for="categoria">Categoría</label>
              <select id="categoria" class="campo" formControlName="categoria_id">
                <option [ngValue]="null">Todas las categorías</option>
                @for (categoria of categorias(); track categoria.id) {
                  <option [ngValue]="categoria.id">{{ categoria.nombre }}</option>
                }
              </select>
            </div>
            <div>
              <label class="etiqueta" for="producto">Producto</label>
              <select id="producto" class="campo" formControlName="producto_id">
                <option [ngValue]="null">Todos los productos</option>
                @for (producto of productos(); track producto.id) {
                  <option [ngValue]="producto.id">{{ producto.nombre_comercial }}</option>
                }
              </select>
            </div>
            <div>
              <label class="etiqueta" for="horno">Horno</label>
              <select id="horno" class="campo" formControlName="horno_id">
                <option [ngValue]="null">Todos los hornos</option>
                @for (horno of hornos(); track horno.id) {
                  <option [ngValue]="horno.id">{{ horno.nombre }}</option>
                }
              </select>
            </div>
            <div>
              <label class="etiqueta" for="turno">Turno</label>
              <select id="turno" class="campo" formControlName="turno_id">
                <option [ngValue]="null">Todos los turnos</option>
                @for (turno of turnos(); track turno.id) {
                  <option [ngValue]="turno.id">{{ turno.nombre }}</option>
                }
              </select>
            </div>
            <div>
              <label class="etiqueta" for="sabor">Sabor</label>
              <select id="sabor" class="campo" formControlName="sabor_id">
                <option [ngValue]="null">Todos los sabores</option>
                @for (sabor of sabores(); track sabor.id) {
                  <option [ngValue]="sabor.id">{{ sabor.nombre }}</option>
                }
              </select>
            </div>
            <div>
              <label class="etiqueta" for="supervisor">Supervisor</label>
              <select id="supervisor" class="campo" formControlName="supervisor_id">
                <option [ngValue]="null">Todos los supervisores</option>
                @for (supervisor of supervisores(); track supervisor.id) {
                  <option [ngValue]="supervisor.id">{{ supervisor.nombre_completo }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Barra de Acciones de Filtro -->
          <div class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <p class="text-xs text-slate-500 font-medium">
              Aplica filtros para acotar el rango de tandas analizadas.
            </p>
            <div class="flex items-center gap-3">
              <app-boton variante="secundario" (click)="limpiar()">
                Limpiar Filtros
              </app-boton>
              <app-boton (click)="consultar()" [cargando]="consultando()">
                Aplicar Filtros
              </app-boton>
            </div>
          </div>
        </form>
      </app-tarjeta>

      @if (cargando()) {
        <app-cargando texto="Calculando indicadores consolidados de planta…" />
      } @else if (indicadores(); as datos) {
        <!-- Sección 1: Volumen y Balance de Masa -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold uppercase tracking-wider text-slate-600">Balance de Masa & Producción</h2>
            <span class="text-xs text-slate-500 font-medium">Totales del período seleccionado</span>
          </div>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <app-indicador
              nombre="Órdenes Procesadas"
              [valor]="datos.numero_ordenes"
              tono="morado"
              subtexto="Total de órdenes con registro"
            />
            <app-indicador
              nombre="Materia Prima (Cruda)"
              [valor]="datos.kg_crudos"
              unidad="kg"
              tono="marca"
              subtexto="Peso neto de papa ingresada"
            />
            <app-indicador
              nombre="Producto Terminado (Frita)"
              [valor]="datos.kg_papa_frita"
              unidad="kg"
              tono="verde"
              subtexto="Papa frita saborizada obtenida"
            />
            <app-indicador
              nombre="Desperdicio Total"
              [valor]="datos.kg_desperdicio"
              unidad="kg"
              tono="rojo"
              subtexto="Merma total registrada en planta"
            />
          </div>
        </div>

        <!-- Sección 2: Eficiencia & Rendimiento -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold uppercase tracking-wider text-slate-600">Eficiencia Operativa & Consumos</h2>
            <span class="text-xs text-slate-500 font-medium">Indicadores clave de proceso</span>
          </div>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <app-indicador
              nombre="Rendimiento Global"
              [valor]="datos.rendimiento_porcentaje"
              unidad="%"
              tono="verde"
              faltante="Faltan datos de horno/saborizado"
              subtexto="Kg frita / Kg cruda procesada"
            />
            <app-indicador
              nombre="Absorción de Aceite"
              [valor]="datos.porcentaje_absorcion_aceite"
              unidad="%"
              tono="ambar"
              faltante="Falta densidad o papa frita"
              subtexto="Porcentaje de aceite en producto"
            />
            <app-indicador
              nombre="Aceite Consumido"
              [valor]="datos.kg_aceite"
              unidad="kg"
              tono="ambar"
              subtexto="Aceite total utilizado en fritura"
            />
            <app-indicador
              nombre="Aceite por Bulto"
              [valor]="datos.aceite_por_bulto"
              unidad="kg/bto"
              tono="azul"
              faltante="Faltan bultos o densidad"
              subtexto="Consumo promedio por bulto crudo"
            />
          </div>
        </div>

        <!-- Gráficas de Distribución Espaciosas -->
        <div class="space-y-4">
          <h2 class="text-sm font-bold uppercase tracking-wider text-slate-600">Distribución Operativa</h2>
          <div class="grid gap-6 lg:grid-cols-2">
            <app-tarjeta titulo="Producción por Horno" subtitulo="Distribución de kilogramos procesados en cada equipo">
              <app-grafica-barras [datos]="datos.por_horno" />
            </app-tarjeta>
            <app-tarjeta titulo="Producción por Turno" subtitulo="Volumen generado por turno de trabajo">
              <app-grafica-barras [datos]="datos.por_turno" />
            </app-tarjeta>
            <app-tarjeta titulo="Top Productos Elaborados" subtitulo="Productos con mayor volumen de producción">
              <app-grafica-barras [datos]="datos.por_producto" />
            </app-tarjeta>
            <app-tarjeta titulo="Desperdicio por Causa" subtitulo="Principales motivos de descarte y merma">
              <app-grafica-barras [datos]="datos.por_tipo_desperdicio" />
            </app-tarjeta>
          </div>
        </div>

        <!-- Cuadro por Categoría -->
        @if (porCategoria().length > 0) {
          <div class="space-y-4">
            <div>
              <h2 class="text-base font-extrabold text-slate-900 tracking-tight">Desempeño por Línea de Categoría</h2>
              <p class="text-xs text-slate-500 font-medium">Métricas desagregadas por tipo de producto</p>
            </div>
            <div class="grid gap-6 lg:grid-cols-2">
              @for (categoria of porCategoria(); track categoria.categoria_id) {
                <app-tarjeta
                  [titulo]="categoria.categoria_nombre"
                  [subtitulo]="categoria.numero_ordenes + ' orden(es) registrada(s)'"
                >
                  <div class="grid grid-cols-2 gap-4">
                    <app-indicador nombre="Cruda" [valor]="categoria.kg_crudos" unidad="kg" tono="marca" />
                    <app-indicador nombre="Frita" [valor]="categoria.kg_papa_frita" unidad="kg" tono="verde" />
                    <app-indicador
                      nombre="Rendimiento"
                      [valor]="categoria.rendimiento_porcentaje"
                      unidad="%"
                      tono="verde"
                      faltante="Sin datos"
                    />
                    <app-indicador
                      nombre="Absorción"
                      [valor]="categoria.porcentaje_absorcion_aceite"
                      unidad="%"
                      tono="ambar"
                      faltante="Sin datos"
                    />
                  </div>
                  @if (categoria.sabores_usados.length > 0) {
                    <div class="mt-6 border-t border-slate-100 pt-5">
                      <p class="mb-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Sabores Aplicados</p>
                      <app-grafica-barras [datos]="categoria.sabores_usados" />
                    </div>
                  }
                </app-tarjeta>
              }
            </div>
          </div>
        }

        <!-- Detalle por tanda de horno -->
        <app-tarjeta
          titulo="Detalle de Tandas de Horno"
          subtitulo="Registro cronológico y parámetros operativos individuales por bache procesado"
          [sinRelleno]="true"
        >
          @if (baches().length === 0) {
            <div class="px-6 py-12 text-center">
              <svg class="mx-auto h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p class="mt-2 text-sm font-medium text-slate-500">
                No hay tandas registradas para los filtros aplicados.
              </p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="tabla">
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Fecha</th>
                    <th>Horno</th>
                    <th>Producto</th>
                    <th>Bultos</th>
                    <th>Kg crudos</th>
                    <th>Kg freídos</th>
                    <th>Aceite</th>
                    <th>Aceite*Bulto</th>
                    <th>Temp.</th>
                    <th>Rendim.</th>
                    <th>Absorc.</th>
                    <th>Duración</th>
                  </tr>
                </thead>
                <tbody>
                  @for (fila of baches(); track fila.registro_id) {
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="font-mono font-bold text-xs whitespace-nowrap text-slate-900">#{{ fila.numero_orden }}</td>
                      <td class="whitespace-nowrap font-mono text-xs text-slate-600">{{ fila.fecha | date: 'dd/MM/yyyy' }}</td>
                      <td class="whitespace-nowrap text-xs font-semibold text-slate-700">{{ fila.horno }}</td>
                      <td class="font-medium text-slate-800">{{ fila.producto }}</td>
                      <td class="tabular-nums font-mono text-xs text-slate-700">{{ fila.cantidad_bultos | number: '1.0-2' }}</td>
                      <td class="tabular-nums font-mono font-bold text-xs text-slate-900">{{ fila.kg_crudos | number: '1.0-2' }}</td>
                      <td class="tabular-nums font-mono text-xs text-slate-700">{{ fila.kg_papa_frita_orden | number: '1.0-2' }}</td>
                      <td class="tabular-nums font-mono text-xs text-slate-700">
                        {{ fila.kg_aceite !== null ? (fila.kg_aceite | number: '1.0-2') : '—' }}
                      </td>
                      <td class="tabular-nums font-mono text-xs text-slate-700">
                        {{
                          fila.aceite_por_bulto !== null
                            ? (fila.aceite_por_bulto | number: '1.0-2')
                            : '—'
                        }}
                      </td>
                      <td class="tabular-nums font-mono text-xs text-slate-700">
                        {{
                          fila.temperatura_aceite_c !== null
                            ? (fila.temperatura_aceite_c | number: '1.0-1') + '°C'
                            : '—'
                        }}
                      </td>
                      <td class="tabular-nums font-mono font-bold text-xs text-emerald-700">
                        {{
                          fila.rendimiento_porcentaje !== null
                            ? (fila.rendimiento_porcentaje | number: '1.0-2') + '%'
                            : '—'
                        }}
                      </td>
                      <td class="tabular-nums font-mono text-xs text-amber-700">
                        {{
                          fila.porcentaje_absorcion_aceite !== null
                            ? (fila.porcentaje_absorcion_aceite | number: '1.0-2') + '%'
                            : '—'
                        }}
                      </td>
                      <td class="tabular-nums font-mono text-xs text-slate-600">{{ fila.duracion_horas | number: '1.0-2' }} h</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </app-tarjeta>
      }
    </div>
  `,
})
export class AnalisisPage {
  private readonly fb = inject(FormBuilder);
  private readonly analitica = inject(AnaliticaService);
  private readonly catalogos = inject(CatalogosService);
  private readonly avisos = inject(NotificacionesService);

  protected readonly cargando = signal(true);
  protected readonly consultando = signal(false);

  protected readonly indicadores = signal<Indicadores | null>(null);
  protected readonly porCategoria = signal<IndicadoresCategoria[]>([]);
  protected readonly baches = signal<FilaBache[]>([]);

  protected readonly categorias = signal<ItemCatalogo[]>([]);
  protected readonly sabores = signal<ItemCatalogo[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly hornos = signal<Horno[]>([]);
  protected readonly turnos = signal<Turno[]>([]);
  protected readonly supervisores = signal<Usuario[]>([]);

  protected readonly formulario = this.fb.group({
    fecha_desde: this.fb.control<string | null>(null),
    fecha_hasta: this.fb.control<string | null>(null),
    categoria_id: this.fb.control<number | null>(null),
    producto_id: this.fb.control<number | null>(null),
    horno_id: this.fb.control<number | null>(null),
    turno_id: this.fb.control<number | null>(null),
    sabor_id: this.fb.control<number | null>(null),
    supervisor_id: this.fb.control<number | null>(null),
  });

  constructor() {
    forkJoin({
      categorias: this.catalogos.listarCategorias(),
      sabores: this.catalogos.listarSabores(),
      productos: this.catalogos.listarProductos(),
      hornos: this.catalogos.listarHornos(),
      turnos: this.catalogos.listarTurnos(),
      supervisores: this.analitica.supervisores(),
    }).subscribe({
      next: (datos) => {
        this.categorias.set(datos.categorias);
        this.sabores.set(datos.sabores);
        this.productos.set(datos.productos);
        this.hornos.set(datos.hornos);
        this.turnos.set(datos.turnos);
        this.supervisores.set(datos.supervisores);
      },
    });

    this.consultar();
  }

  private filtros(): FiltrosAnalisis {
    return this.formulario.getRawValue() as FiltrosAnalisis;
  }

  protected consultar(): void {
    const filtros = this.filtros();
    this.consultando.set(true);
    forkJoin({
      indicadores: this.analitica.indicadores(filtros),
      porCategoria: this.analitica.porCategoria(filtros),
      baches: this.analitica.baches(filtros),
    }).subscribe({
      next: ({ indicadores, porCategoria, baches }) => {
        this.indicadores.set(indicadores);
        this.porCategoria.set(porCategoria);
        this.baches.set(baches);
        this.cargando.set(false);
        this.consultando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.consultando.set(false);
      },
    });
  }

  protected limpiar(): void {
    this.formulario.reset();
    this.consultar();
  }

  protected exportar(formato: 'csv' | 'xlsx'): void {
    this.analitica.exportar(this.filtros(), formato).subscribe({
      next: (archivo) => {
        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `datacontrol_${new Date().toISOString().slice(0, 10)}.${formato}`;
        enlace.click();
        URL.revokeObjectURL(url);
        this.avisos.exito('Archivo generado.');
      },
    });
  }
}

