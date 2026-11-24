import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconoComponent, type NombreIcono } from '../../ui/icono.component';

/** Menú principal de catálogos y configuración de planta. */
@Component({
  selector: 'app-catalogos-indice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconoComponent],
  template: `
    <div class="pagina-contenido mx-auto max-w-6xl">
      <header>
        <p class="etiqueta-seccion">Administración</p>
        <h1 class="titulo-pagina mt-1">Catálogos maestros</h1>
        <p class="subtitulo-pagina">
          Productos, líneas, hornos, sabores y parámetros que usa toda la planta.
        </p>
      </header>

      <div class="escalona grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        @for (item of catalogos; track item.ruta) {
          <a
            [routerLink]="item.ruta"
            class="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-marca-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-500"
          >
            <span class="grid size-12 place-items-center rounded-xl bg-marca-50 text-marca-700 ring-1 ring-marca-100 transition-colors group-hover:bg-marca-600 group-hover:text-white">
              <app-icono [nombre]="item.icono" [tamano]="24" />
            </span>
            <h2 class="mt-4 text-lg font-bold text-marca-950">{{ item.titulo }}</h2>
            <p class="mb-5 mt-1.5 flex-1 text-[0.95rem] leading-relaxed text-slate-600">
              {{ item.descripcion }}
            </p>
            <div class="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-[0.95rem] font-bold text-marca-700">
              <span>Abrir</span>
              <app-icono nombre="flechaDerecha" [tamano]="18" class="transition-transform group-hover:translate-x-1" />
            </div>
          </a>
        }
      </div>
    </div>
  `,
})
export class CatalogosIndicePage {
  protected readonly catalogos = [
    {
      ruta: '/catalogos/productos',
      titulo: 'Productos',
      icono: 'bulto' as NombreIcono,
      descripcion: 'Referencias comerciales, recetas y peso nominal por canastilla.',
    },
    {
      ruta: '/catalogos/categorias',
      titulo: 'Categorías',
      icono: 'etiqueta' as NombreIcono,
      descripcion: 'Tipos de corte: hojuela, rizada, cabello de ángel y mezclas.',
    },
    {
      ruta: '/catalogos/sabores',
      titulo: 'Sabores y Especias',
      icono: 'salero' as NombreIcono,
      descripcion: 'Fórmulas y sazonadores que se aplican en el tambor de saborizado.',
    },
    {
      ruta: '/catalogos/hornos',
      titulo: 'Líneas y Hornos',
      icono: 'llama' as NombreIcono,
      descripcion: 'Capacidad de líneas continuas y calibración geométrica de tanques.',
    },
    {
      ruta: '/catalogos/turnos',
      titulo: 'Turnos Operativos',
      icono: 'reloj' as NombreIcono,
      descripcion: 'Horarios de trabajo de la planta, rotaciones y turnos nocturnos.',
    },
    {
      ruta: '/catalogos/tipos-desperdicio',
      titulo: 'Tipos de Desperdicio',
      icono: 'basura' as NombreIcono,
      descripcion: 'Clasificación de mermas: quemada, cruda, defecto visual y barredura.',
    },
    {
      ruta: '/catalogos/variedades',
      titulo: 'Tipos de Materia Prima',
      icono: 'hoja' as NombreIcono,
      descripcion: 'Variedades por línea (plátano Hartón, FHIA 21…) que se escogen en la orden.',
    },
    {
      ruta: '/catalogos/aceites',
      titulo: 'Tipos de Aceite',
      icono: 'gota' as NombreIcono,
      descripcion: 'Aceites de fritura con su densidad (kg/L) y proveedor, asignables a cada horno.',
    },
    {
      ruta: '/catalogos/densidad-aceite',
      titulo: 'Densidad del Aceite',
      icono: 'barril' as NombreIcono,
      descripcion: 'Muestreos por horno y fecha para cálculo volumétrico de absorción.',
    },
    {
      ruta: '/catalogos/configuracion',
      titulo: 'Parámetros Globales',
      icono: 'engranaje' as NombreIcono,
      descripcion: 'Tara de canastillas, peso estándar por bulto y factores de merma.',
    },
  ];
}
