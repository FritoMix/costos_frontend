import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'texto' | 'acento';
export type TamanoBoton = 'normal' | 'grande' | 'pequeno';

/**
 * Botón futurista en Azul Cálido / Zafiro de alto contraste y ergonomía táctil.
 */
@Component({
  selector: 'app-boton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="tipo()"
      [disabled]="deshabilitado() || cargando()"
      [class]="clases()"
    >
      @if (cargando()) {
        <svg
          class="h-4 w-4 animate-spin text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      }
      <ng-content />
    </button>
  `,
})
export class BotonComponent {
  readonly variante = input<VarianteBoton>('primario');
  readonly tamano = input<TamanoBoton>('normal');
  readonly tipo = input<'button' | 'submit'>('button');
  readonly deshabilitado = input(false);
  readonly cargando = input(false);
  readonly anchoCompleto = input(false);

  protected readonly clases = computed(() => {
    const base =
      'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 ' +
      'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none ' +
      'active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2';

    const porVariante: Record<VarianteBoton, string> = {
      primario:
        'rounded-2xl bg-gradient-to-b from-sky-500 to-marca-600 text-white shadow-md hover:from-sky-600 hover:to-marca-700 hover:shadow-lg hover:shadow-sky-500/25 outline-sky-600 border border-sky-400/40',
      secundario:
        'rounded-2xl border border-sky-200/90 bg-white/90 text-sky-900 shadow-xs hover:bg-sky-50 hover:border-sky-300 hover:text-sky-950 outline-sky-400',
      acento:
        'rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 text-white shadow-sm hover:from-slate-700 hover:to-slate-800 outline-slate-800 border border-slate-700/40',
      peligro:
        'rounded-2xl bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-sm hover:from-rose-600 hover:to-rose-700 hover:shadow-md hover:shadow-rose-500/25 outline-rose-600 border border-rose-500/40',
      texto:
        'rounded-xl text-sky-700 hover:bg-sky-50/80 hover:text-sky-800 outline-sky-600 px-2 py-1',
    };

    const porTamano: Record<TamanoBoton, string> = {
      pequeno: 'min-h-9 px-3 py-1.5 text-xs',
      normal: 'min-h-11 px-4 py-2.5 text-sm tracking-tight',
      grande: 'min-h-13 px-6 py-3 text-base tracking-tight',
    };

    return [
      base,
      porVariante[this.variante()],
      porTamano[this.tamano()],
      this.anchoCompleto() ? 'w-full' : '',
    ].join(' ');
  });
}
