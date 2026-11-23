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
      <div
        class="anim-deslizar mx-5 mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/95 px-4 py-3.5 text-rose-950 shadow-sm shadow-rose-500/10 sm:mx-7"
        role="alert"
        data-testid="dato-imposible"
      >
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700" aria-hidden="true">
          <svg class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </span>
        <div class="min-w-0">
          <p class="text-xs font-bold uppercase tracking-wider text-rose-700">Dato no válido</p>
          <p class="mt-0.5 text-sm font-semibold leading-snug">{{ error }}</p>
        </div>
      </div>
    } @else if (revision().aviso; as aviso) {
      <div
        class="anim-deslizar mx-5 mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-sm sm:mx-7"
        [class]="confirmado()
          ? 'border-emerald-200 bg-emerald-50/95 text-emerald-950 shadow-emerald-500/10'
          : 'border-amber-200 bg-amber-50/95 text-amber-950 shadow-amber-500/10'"
        role="status"
      >
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          [class]="confirmado() ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
          aria-hidden="true"
        >
          @if (confirmado()) {
            <svg class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          } @else {
            <svg class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-bold uppercase tracking-wider" [class]="confirmado() ? 'text-emerald-700' : 'text-amber-700'">
            {{ confirmado() ? 'Dato confirmado' : 'Revisa este dato' }}
          </p>
          <p class="mt-0.5 text-sm font-semibold leading-snug">{{ aviso }}</p>
          @if (!confirmado()) {
            <button
              type="button"
              data-testid="confirmar-dato"
              (click)="confirmar.emit()"
              class="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-amber-600/20 transition-all duration-200 hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 active:scale-[0.98]"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Sí, el dato está bien
            </button>
          } @else {
            <p class="mt-1 text-xs font-medium text-emerald-700">Puedes continuar.</p>
          }
        </div>
      </div>
    }
  `,
})
export class RevisionPasoComponent {
  readonly revision = input.required<Revision>();
  readonly confirmado = input(false);
  readonly confirmar = output<void>();
}
