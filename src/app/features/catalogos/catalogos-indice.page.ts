import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Menú principal de catálogos y configuración de planta. */
@Component({
  selector: 'app-catalogos-indice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-6xl space-y-8">
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
            class="group relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-100/50"
          >
            <div>
              <div class="flex items-center justify-between gap-3 mb-4">
                <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-slate-700 font-semibold group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300 border border-sky-100">
                  <span class="text-2xl">{{ item.icono }}</span>
                </span>
                <span class="text-xs font-mono font-bold text-slate-400 group-hover:text-slate-900 transition-colors bg-slate-100 px-2.5 py-1 rounded-lg">
                  #{{ item.codigo }}
                </span>
              </div>
              <h2 class="text-lg font-bold text-slate-900 group-hover:text-marca-700 transition-colors">
                {{ item.titulo }}
              </h2>
              <p class="mt-2 text-xs text-slate-500 font-medium leading-relaxed">
                {{ item.descripcion }}
              </p>
            </div>

            <div class="mt-6 flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs font-bold text-slate-600 group-hover:text-marca-700">
              <span>Gestionar catálogo</span>
              <svg class="h-4 w-4 transform transition-transform group-hover:translate-x-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
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
      codigo: 'PROD',
      icono: '🥔',
      descripcion: 'Referencias comerciales, recetas y peso nominal por canastilla.',
    },
    {
      ruta: '/catalogos/categorias',
      titulo: 'Categorías',
      codigo: 'CAT',
      icono: '🏷️',
      descripcion: 'Tipos de corte: hojuela, rizada, cabello de ángel y mezclas.',
    },
    {
      ruta: '/catalogos/sabores',
      titulo: 'Sabores y Especias',
      codigo: 'SAB',
      icono: '🧂',
      descripcion: 'Fórmulas y sazonadores que se aplican en el tambor de saborizado.',
    },
    {
      ruta: '/catalogos/hornos',
      titulo: 'Líneas y Hornos',
      codigo: 'HRN',
      icono: '♨️',
      descripcion: 'Capacidad de líneas continuas y calibración geométrica de tanques.',
    },
    {
      ruta: '/catalogos/turnos',
      titulo: 'Turnos Operativos',
      codigo: 'TRN',
      icono: '⏱️',
      descripcion: 'Horarios de trabajo de la planta, rotaciones y turnos nocturnos.',
    },
    {
      ruta: '/catalogos/tipos-desperdicio',
      titulo: 'Tipos de Desperdicio',
      codigo: 'DSP',
      icono: '🗑️',
      descripcion: 'Clasificación de mermas: quemada, cruda, defecto visual y barredura.',
    },
    {
      ruta: '/catalogos/densidad-aceite',
      titulo: 'Densidad del Aceite',
      codigo: 'DNS',
      icono: '🛢️',
      descripcion: 'Muestreos por horno y fecha para cálculo volumétrico de absorción.',
    },
    {
      ruta: '/catalogos/configuracion',
      titulo: 'Parámetros Globales',
      codigo: 'CFG',
      icono: '⚙️',
      descripcion: 'Tara de canastillas, peso estándar por bulto y factores de merma.',
    },
  ];
}


