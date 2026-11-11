import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Indicador de carga futurista cálido */
@Component({
  selector: 'app-cargando',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-slate-500" role="status">
      <div class="relative flex h-10 w-10 items-center justify-center">
        <span class="absolute h-10 w-10 animate-ping rounded-full bg-marca-400 opacity-20"></span>
        <span class="absolute h-8 w-8 rounded-full border-2 border-sky-200 border-t-marca-500 animate-spin"></span>
        <span class="h-3 w-3 rounded-full bg-gradient-to-br from-sky-400 to-marca-600" style="box-shadow: 0 0 10px rgba(56,189,248,0.5);"></span>
      </div>
      <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">{{ texto() }}</span>
    </div>
  `,
})
export class CargandoComponent {
  readonly texto = input('Cargando información…');
}
