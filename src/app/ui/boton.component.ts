import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'texto' | 'acento';
export type TamanoBoton = 'normal' | 'grande' | 'pequeno';

/**
 * Botón de DATACONTROL: colores sólidos de la marca, alto contraste y tamaño táctil.
 */
@Component({
  selector: 'app-boton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex max-w-full align-middle', '[class.w-full]': 'anchoCompleto()' },
  template: `
    <button
      [type]="tipo()"
      [disabled]="deshabilitado() || cargando()"
      [class]="clases()"
      [attr.data-testid]="testId() || null"
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
  /** Identificador estable para las pruebas E2E (se renderiza como data-testid). */
  readonly testId = input('');

  protected readonly clases = computed(() => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-xl font-bold tracking-tight ' +
      'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ' +
      'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none ' +
      'active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2';

    // Un solo lenguaje: colores sólidos de la marca, sin degradados.
    const porVariante: Record<VarianteBoton, string> = {
      primario:
        'bg-marca-600 text-white shadow-sm shadow-marca-900/20 hover:bg-marca-700 hover:shadow-md outline-marca-600',
      secundario:
        'border-[1.5px] border-slate-300 bg-white text-marca-950 shadow-xs hover:border-marca-400 hover:bg-marca-50 outline-marca-500',
      acento:
        'bg-marca-950 text-white shadow-sm hover:bg-marca-900 hover:shadow-md outline-marca-900',
      peligro:
        'bg-rose-600 text-white shadow-sm shadow-rose-900/20 hover:bg-rose-700 hover:shadow-md outline-rose-600',
      texto: 'text-marca-700 hover:bg-marca-50 hover:text-marca-900 outline-marca-600 px-2 py-1',
    };

    const porTamano: Record<TamanoBoton, string> = {
      pequeno: 'min-h-10 px-3.5 py-1.5 text-sm',
      normal: 'min-h-12 px-5 py-2.5 text-[0.95rem]',
      grande: 'min-h-14 px-6 py-3 text-base',
    };

    return [
      base,
      porVariante[this.variante()],
      porTamano[this.tamano()],
      this.anchoCompleto() ? 'w-full' : '',
    ].join(' ');
  });
}
