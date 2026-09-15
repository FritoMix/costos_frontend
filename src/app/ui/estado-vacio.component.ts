import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Mensaje elegante cálido para cuando una lista no tiene nada que mostrar todavía. */
@Component({
  selector: 'app-estado-vacio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-6 py-12 sm:py-16 text-center anim-entrada">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-calido-100/60 text-stone-400 ring-1 ring-calido-200/40 mb-4"
           style="backdrop-filter: blur(8px);">
        <svg class="h-7 w-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </div>
      <h3 class="text-base font-bold text-stone-800 tracking-tight">{{ titulo() }}</h3>
      @if (descripcion()) {
        <p class="mx-auto mt-1.5 max-w-sm text-sm text-stone-500 font-normal leading-relaxed">{{ descripcion() }}</p>
      }
      <div class="mt-5 flex justify-center">
        <ng-content />
      </div>
    </div>
  `,
})
export class EstadoVacioComponent {
  readonly titulo = input.required<string>();
  readonly descripcion = input('');
}
