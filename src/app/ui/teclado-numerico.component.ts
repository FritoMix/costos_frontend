import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * Teclado numérico en pantalla futurista cálido, pensado para la planta: teclas grandes,
 * glassmorphism, sin necesidad de teclado físico y con la coma decimal a mano.
 *
 * El valor se maneja como TEXTO para poder escribir "12." mientras se teclea
 * y evitar los saltos raros de los campos numéricos. Quien lo usa convierte
 * a número al guardar.
 *
 * Uso:
 *   <app-teclado-numerico [(valor)]="bultos" unidad="bultos" />
 */
@Component({
  selector: 'app-teclado-numerico',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-sm">
      <!-- Visor -->
      <div class="rounded-3xl border border-calido-200/80 p-6 text-center shadow-inner relative overflow-hidden"
           style="background: linear-gradient(135deg, rgba(250,245,238,0.9) 0%, rgba(255,249,240,0.7) 100%); backdrop-filter: blur(8px);">
        <p class="text-6xl font-extrabold text-stone-900 tabular-nums font-mono tracking-tight">{{ valor() || '0' }}</p>
        @if (unidad()) {
          <span class="mt-1.5 inline-block rounded-full bg-marca-50 px-3 py-0.5 text-xs font-extrabold uppercase tracking-widest text-marca-700 border border-marca-200/50">
            {{ unidad() }}
          </span>
        }
      </div>

      <!-- Teclas -->
      <div class="mt-4 grid grid-cols-3 gap-2.5">
        @for (tecla of teclas; track tecla) {
          <button type="button" (click)="pulsar(tecla)" [class]="claseTecla">{{ tecla }}</button>
        }
        @if (permiteDecimales()) {
          <button type="button" (click)="pulsarDecimal()" [class]="claseTecla" aria-label="Coma decimal">,</button>
        } @else {
          <span></span>
        }
        <button type="button" (click)="pulsar('0')" [class]="claseTecla">0</button>
        <button type="button" (click)="borrar()" [class]="claseTeclaAccion" aria-label="Borrar">
          <svg class="mx-auto h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z"
            />
          </svg>
        </button>
      </div>
    </div>
  `,
})
export class TecladoNumericoComponent {
  /** Valor actual, como texto. Enlace de doble vía con la pantalla. */
  readonly valor = model<string>('0');
  /** Texto bajo el número: "bultos", "kg", "°C"… */
  readonly unidad = input<string>('');
  readonly permiteDecimales = input<boolean>(true);
  /** Cuántos dígitos como máximo (sin contar la coma). */
  readonly maxDigitos = input<number>(7);

  protected readonly teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  protected readonly claseTecla =
    'flex h-14 items-center justify-center rounded-2xl border border-calido-200/80 bg-white/80 text-2xl ' +
    'font-extrabold text-stone-800 shadow-2xs transition-all duration-150 hover:border-marca-400 hover:bg-marca-50 ' +
    'hover:text-marca-800 hover:shadow-sm active:scale-95 active:bg-marca-100 font-mono';

  protected readonly claseTeclaAccion =
    'flex h-14 items-center justify-center rounded-2xl border border-calido-200/80 bg-calido-100/60 ' +
    'text-stone-500 shadow-2xs transition-all duration-150 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 active:scale-95';

  protected pulsar(digito: string): void {
    const actual = this.valor();
    // Si está en "0", el dígito lo reemplaza (no queda "05").
    const nuevo = actual === '0' || actual === '' ? digito : actual + digito;
    if (nuevo.replace('.', '').length > this.maxDigitos()) {
      return;
    }
    this.valor.set(nuevo);
  }

  protected pulsarDecimal(): void {
    const actual = this.valor();
    if (actual.includes('.')) {
      return;
    }
    this.valor.set((actual === '' ? '0' : actual) + '.');
  }

  protected borrar(): void {
    const recortado = this.valor().slice(0, -1);
    this.valor.set(recortado === '' ? '0' : recortado);
  }
}
