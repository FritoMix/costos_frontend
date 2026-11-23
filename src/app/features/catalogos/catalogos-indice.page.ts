import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Menú principal de catálogos y configuración de planta. */
@Component({
  selector: 'app-catalogos-indice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="pagina-contenido mx-auto max-w-6xl">
      <header class="border-b border-slate-200/80 pb-5">
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Catálogos Maestros</h1>
        <p class="mt-1.5 text-sm text-slate-500 font-medium max-w-3xl leading-relaxed">
          Administración de parámetros operativos, referencias comerciales, líneas de producción, calibraciones y tablas maestras.
        </p>
      </header>

      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        @for (item of catalogos; track item.ruta) {
          <a
            [routerLink]="item.ruta"
            class="group flex flex-col rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-zinc-900 transition-colors hover:border-zinc-400 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600"
          >
            <span aria-hidden="true" class="grid size-10 place-items-center rounded-lg bg-zinc-100 text-xl grayscale">
              {{ item.icono }}
            </span>
            <h2 class="mt-4 text-base font-semibold">{{ item.titulo }}</h2>
            <p class="mb-5 mt-1 flex-1 text-sm leading-relaxed text-zinc-600">
              {{ item.descripcion }}
            </p>
            <div class="flex items-center justify-between gap-3 border-t border-zinc-200 pt-3 text-sm font-medium text-zinc-700">
              <span>Gestionar catálogo</span>
              <svg aria-hidden="true" class="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
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
      icono: '🥔',
      descripcion: 'Referencias comerciales, recetas y peso nominal por canastilla.',
    },
    {
      ruta: '/catalogos/categorias',
      titulo: 'Categorías',
      icono: '🏷️',
      descripcion: 'Tipos de corte: hojuela, rizada, cabello de ángel y mezclas.',
    },
    {
      ruta: '/catalogos/sabores',
      titulo: 'Sabores y Especias',
      icono: '🧂',
      descripcion: 'Fórmulas y sazonadores que se aplican en el tambor de saborizado.',
    },
    {
      ruta: '/catalogos/hornos',
      titulo: 'Líneas y Hornos',
      icono: '♨️',
      descripcion: 'Capacidad de líneas continuas y calibración geométrica de tanques.',
    },
    {
      ruta: '/catalogos/turnos',
      titulo: 'Turnos Operativos',
      icono: '⏱️',
      descripcion: 'Horarios de trabajo de la planta, rotaciones y turnos nocturnos.',
    },
    {
      ruta: '/catalogos/tipos-desperdicio',
      titulo: 'Tipos de Desperdicio',
      icono: '🗑️',
      descripcion: 'Clasificación de mermas: quemada, cruda, defecto visual y barredura.',
    },
    {
      ruta: '/catalogos/variedades',
      titulo: 'Tipos de Materia Prima',
      codigo: 'VAR',
      icono: '🍌',
      descripcion: 'Variedades por línea (plátano Hartón, FHIA 21…) que se escogen en la orden.',
      bgGradient: 'linear-gradient(135deg, #d9f99d 0%, #ecfccb 50%, #f7fee7 100%)',
      borderColor: '#84cc16',
      iconBg: '#bef264',
      badgeBg: '#65a30d',
      textColor: '#365314',
      descColor: '#3f6212',
      accentColor: '#a3e635',
      shadowColor: 'rgba(101,163,13,0.25)',
    },
    {
      ruta: '/catalogos/aceites',
      titulo: 'Tipos de Aceite',
      icono: '🫗',
      descripcion: 'Aceites de fritura con su densidad (kg/L) y proveedor, asignables a cada horno.',
    },
    {
      ruta: '/catalogos/densidad-aceite',
      titulo: 'Densidad del Aceite',
      icono: '🛢️',
      descripcion: 'Muestreos por horno y fecha para cálculo volumétrico de absorción.',
    },
    {
      ruta: '/catalogos/configuracion',
      titulo: 'Parámetros Globales',
      icono: '⚙️',
      descripcion: 'Tara de canastillas, peso estándar por bulto y factores de merma.',
    },
  ];
}
