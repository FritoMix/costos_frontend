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
      bgGradient: 'linear-gradient(135deg, #93c5fd 0%, #bfdbfe 60%, #dbeafe 100%)',
      borderColor: '#2563eb',
      iconBg: '#60a5fa',
      badgeBg: '#1d4ed8',
      textColor: '#1e3a8a',
      descColor: '#1e40af',
      accentColor: '#1d4ed8',
      shadowColor: 'rgba(37,99,235,0.4)',
    },
    {
      ruta: '/catalogos/categorias',
      titulo: 'Categorías',
      codigo: 'CAT',
      icono: '🏷️',
      descripcion: 'Tipos de corte: hojuela, rizada, cabello de ángel y mezclas.',
      bgGradient: 'linear-gradient(135deg, #6ee7b7 0%, #a7f3d0 60%, #d1fae5 100%)',
      borderColor: '#059669',
      iconBg: '#34d399',
      badgeBg: '#065f46',
      textColor: '#064e3b',
      descColor: '#065f46',
      accentColor: '#059669',
      shadowColor: 'rgba(5,150,105,0.4)',
    },
    {
      ruta: '/catalogos/sabores',
      titulo: 'Sabores y Especias',
      codigo: 'SAB',
      icono: '🧂',
      descripcion: 'Fórmulas y sazonadores que se aplican en el tambor de saborizado.',
      bgGradient: 'linear-gradient(135deg, #c4b5fd 0%, #ddd6fe 60%, #ede9fe 100%)',
      borderColor: '#7c3aed',
      iconBg: '#a78bfa',
      badgeBg: '#4c1d95',
      textColor: '#3b0764',
      descColor: '#4c1d95',
      accentColor: '#7c3aed',
      shadowColor: 'rgba(124,58,237,0.4)',
    },
    {
      ruta: '/catalogos/hornos',
      titulo: 'Líneas y Hornos',
      codigo: 'HRN',
      icono: '♨️',
      descripcion: 'Capacidad de líneas continuas y calibración geométrica de tanques.',
      bgGradient: 'linear-gradient(135deg, #fca5a5 0%, #fecaca 60%, #fee2e2 100%)',
      borderColor: '#dc2626',
      iconBg: '#f87171',
      badgeBg: '#991b1b',
      textColor: '#7f1d1d',
      descColor: '#991b1b',
      accentColor: '#dc2626',
      shadowColor: 'rgba(220,38,38,0.4)',
    },
    {
      ruta: '/catalogos/turnos',
      titulo: 'Turnos Operativos',
      codigo: 'TRN',
      icono: '⏱️',
      descripcion: 'Horarios de trabajo de la planta, rotaciones y turnos nocturnos.',
      bgGradient: 'linear-gradient(135deg, #67e8f9 0%, #a5f3fc 60%, #cffafe 100%)',
      borderColor: '#0891b2',
      iconBg: '#22d3ee',
      badgeBg: '#155e75',
      textColor: '#083344',
      descColor: '#0e7490',
      accentColor: '#0891b2',
      shadowColor: 'rgba(8,145,178,0.4)',
    },
    {
      ruta: '/catalogos/tipos-desperdicio',
      titulo: 'Tipos de Desperdicio',
      codigo: 'DSP',
      icono: '🗑️',
      descripcion: 'Clasificación de mermas: quemada, cruda, defecto visual y barredura.',
      bgGradient: 'linear-gradient(135deg, #f9a8d4 0%, #fbcfe8 60%, #fce7f3 100%)',
      borderColor: '#db2777',
      iconBg: '#f472b6',
      badgeBg: '#9d174d',
      textColor: '#831843',
      descColor: '#9d174d',
      accentColor: '#db2777',
      shadowColor: 'rgba(219,39,119,0.4)',
    },
    {
      ruta: '/catalogos/densidad-aceite',
      titulo: 'Densidad del Aceite',
      codigo: 'DNS',
      icono: '🛢️',
      descripcion: 'Muestreos por horno y fecha para cálculo volumétrico de absorción.',
      bgGradient: 'linear-gradient(135deg, #fcd34d 0%, #fde68a 60%, #fef3c7 100%)',
      borderColor: '#d97706',
      iconBg: '#fbbf24',
      badgeBg: '#92400e',
      textColor: '#451a03',
      descColor: '#78350f',
      accentColor: '#d97706',
      shadowColor: 'rgba(217,119,6,0.4)',
    },
    {
      ruta: '/catalogos/configuracion',
      titulo: 'Parámetros Globales',
      codigo: 'CFG',
      icono: '⚙️',
      descripcion: 'Tara de canastillas, peso estándar por bulto y factores de merma.',
      bgGradient: 'linear-gradient(135deg, #a5b4fc 0%, #c7d2fe 60%, #e0e7ff 100%)',
      borderColor: '#4f46e5',
      iconBg: '#818cf8',
      badgeBg: '#3730a3',
      textColor: '#1e1b4b',
      descColor: '#3730a3',
      accentColor: '#4f46e5',
      shadowColor: 'rgba(79,70,229,0.4)',
    },
  ];
}
