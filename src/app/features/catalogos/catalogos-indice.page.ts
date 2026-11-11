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
            class="group relative flex flex-col justify-between rounded-3xl border-2 p-6 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl overflow-hidden"
            [style]="'background:' + item.bgGradient + '; border-color:' + item.borderColor + ';'"
          >
            <!-- Círculo decorativo grande de fondo -->
            <div
              class="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full opacity-40 transition-opacity duration-300 group-hover:opacity-70"
              [style]="'background:' + item.accentColor + ';'"
            ></div>
            <!-- Segundo círculo pequeño arriba -->
            <div
              class="pointer-events-none absolute -top-6 -left-6 h-20 w-20 rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-300"
              [style]="'background:' + item.accentColor + ';'"
            ></div>

            <div class="relative">
              <div class="flex items-center justify-between gap-3 mb-5">
                <span
                  class="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-lg border-2 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                  [style]="'background:' + item.iconBg + '; border-color:' + item.borderColor + '; box-shadow: 0 4px 14px ' + item.shadowColor + ';'"
                >
                  {{ item.icono }}
                </span>
                <span
                  class="text-xs font-mono font-extrabold px-3 py-1.5 rounded-xl border-2"
                  [style]="'background:' + item.badgeBg + '; color:' + item.textColor + '; border-color:' + item.borderColor + ';'"
                >
                  #{{ item.codigo }}
                </span>
              </div>
              <h2 class="text-xl font-extrabold" [style]="'color:' + item.textColor + ';'">
                {{ item.titulo }}
              </h2>
              <p class="mt-2 text-sm font-medium leading-relaxed" [style]="'color:' + item.descColor + ';'">
                {{ item.descripcion }}
              </p>
            </div>

            <div
              class="relative mt-6 flex items-center justify-between border-t-2 pt-4 text-sm font-bold"
              [style]="'border-color:' + item.borderColor + '; color:' + item.textColor + ';'"
            >
              <span>Gestionar catálogo</span>
              <svg class="h-5 w-5 transform transition-transform group-hover:translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
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
      bgGradient: 'linear-gradient(135deg, #92d4f2 0%, #b4e3f7 50%, #d8f1fc 100%)',
      borderColor: '#38bdf8',
      iconBg: '#7dd3fc',
      badgeBg: '#0284c7',
      textColor: '#0c4a6e',
      descColor: '#0369a1',
      accentColor: '#38bdf8',
      shadowColor: 'rgba(2,132,199,0.25)',
    },
    {
      ruta: '/catalogos/categorias',
      titulo: 'Categorías',
      codigo: 'CAT',
      icono: '🏷️',
      descripcion: 'Tipos de corte: hojuela, rizada, cabello de ángel y mezclas.',
      bgGradient: 'linear-gradient(135deg, #ffffc5 0%, #fef9c3 50%, #fefce8 100%)',
      borderColor: '#eab308',
      iconBg: '#fef08a',
      badgeBg: '#ca8a04',
      textColor: '#713f12',
      descColor: '#854d0e',
      accentColor: '#fde047',
      shadowColor: 'rgba(202,138,4,0.25)',
    },
    {
      ruta: '/catalogos/sabores',
      titulo: 'Sabores y Especias',
      codigo: 'SAB',
      icono: '🧂',
      descripcion: 'Fórmulas y sazonadores que se aplican en el tambor de saborizado.',
      bgGradient: 'linear-gradient(135deg, #92d4f2 0%, #b4e3f7 50%, #d8f1fc 100%)',
      borderColor: '#38bdf8',
      iconBg: '#7dd3fc',
      badgeBg: '#0284c7',
      textColor: '#0c4a6e',
      descColor: '#0369a1',
      accentColor: '#38bdf8',
      shadowColor: 'rgba(2,132,199,0.25)',
    },
    {
      ruta: '/catalogos/hornos',
      titulo: 'Líneas y Hornos',
      codigo: 'HRN',
      icono: '♨️',
      descripcion: 'Capacidad de líneas continuas y calibración geométrica de tanques.',
      bgGradient: 'linear-gradient(135deg, #ffffc5 0%, #fef9c3 50%, #fefce8 100%)',
      borderColor: '#eab308',
      iconBg: '#fef08a',
      badgeBg: '#ca8a04',
      textColor: '#713f12',
      descColor: '#854d0e',
      accentColor: '#fde047',
      shadowColor: 'rgba(202,138,4,0.25)',
    },
    {
      ruta: '/catalogos/turnos',
      titulo: 'Turnos Operativos',
      codigo: 'TRN',
      icono: '⏱️',
      descripcion: 'Horarios de trabajo de la planta, rotaciones y turnos nocturnos.',
      bgGradient: 'linear-gradient(135deg, #92d4f2 0%, #b4e3f7 50%, #d8f1fc 100%)',
      borderColor: '#38bdf8',
      iconBg: '#7dd3fc',
      badgeBg: '#0284c7',
      textColor: '#0c4a6e',
      descColor: '#0369a1',
      accentColor: '#38bdf8',
      shadowColor: 'rgba(2,132,199,0.25)',
    },
    {
      ruta: '/catalogos/tipos-desperdicio',
      titulo: 'Tipos de Desperdicio',
      codigo: 'DSP',
      icono: '🗑️',
      descripcion: 'Clasificación de mermas: quemada, cruda, defecto visual y barredura.',
      bgGradient: 'linear-gradient(135deg, #ffffc5 0%, #fef9c3 50%, #fefce8 100%)',
      borderColor: '#eab308',
      iconBg: '#fef08a',
      badgeBg: '#ca8a04',
      textColor: '#713f12',
      descColor: '#854d0e',
      accentColor: '#fde047',
      shadowColor: 'rgba(202,138,4,0.25)',
    },
    {
      ruta: '/catalogos/densidad-aceite',
      titulo: 'Densidad del Aceite',
      codigo: 'DNS',
      icono: '🛢️',
      descripcion: 'Muestreos por horno y fecha para cálculo volumétrico de absorción.',
      bgGradient: 'linear-gradient(135deg, #92d4f2 0%, #b4e3f7 50%, #d8f1fc 100%)',
      borderColor: '#38bdf8',
      iconBg: '#7dd3fc',
      badgeBg: '#0284c7',
      textColor: '#0c4a6e',
      descColor: '#0369a1',
      accentColor: '#38bdf8',
      shadowColor: 'rgba(2,132,199,0.25)',
    },
    {
      ruta: '/catalogos/configuracion',
      titulo: 'Parámetros Globales',
      codigo: 'CFG',
      icono: '⚙️',
      descripcion: 'Tara de canastillas, peso estándar por bulto y factores de merma.',
      bgGradient: 'linear-gradient(135deg, #ffffc5 0%, #fef9c3 50%, #fefce8 100%)',
      borderColor: '#eab308',
      iconBg: '#fef08a',
      badgeBg: '#ca8a04',
      textColor: '#713f12',
      descColor: '#854d0e',
      accentColor: '#fde047',
      shadowColor: 'rgba(202,138,4,0.25)',
    },
  ];
}
