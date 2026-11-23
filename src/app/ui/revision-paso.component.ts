import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { Revision } from '../core/poka-yoke';

/**
 * Mensaje grande debajo de un paso del asistente cuando el dato es
 * imposible (rojo, no deja seguir) o raro (amarillo, pide confirmar).
 */
@Component({
  selector: 'app-revision-paso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (revision().error; as error) {
      <div class="mx-5 mb-4 rounded-2xl border-2 border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 sm:mx-7" role="alert" data-testid="dato-imposible">
        ✋ {{ error }}
      </div>
    } @else if (revision().aviso; as aviso) {
      <div class="mx-5 mb-4 rounded-2xl border-2 px-4 py-3 sm:mx-7"
        [class]="confirmado() ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'">
        <p class="text-sm font-semibold" [class]="confirmado() ? 'text-emerald-800' : 'text-amber-900'">⚠️ {{ aviso }}</p>
        @if (!confirmado()) {
          <button type="button" data-testid="confirmar-dato" (click)="confirmar.emit()"
            class="mt-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600">
            Sí, el dato está bien
          </button>
        } @else {
          <p class="mt-1 text-xs font-semibold text-emerald-700">Confirmado. Puedes continuar.</p>
        }
      </div>
    }
  `,
})
export class RevisionPasoComponent {
  readonly revision = input.required<Revision>();
  readonly confirmado = input(false);
  readonly confirmar = output<void>();
}
