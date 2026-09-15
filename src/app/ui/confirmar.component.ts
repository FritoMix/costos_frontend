import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { BotonComponent } from './boton.component';

/**
 * Ventana modal de confirmación con diseño futurista cálido y glassmorphism.
 */
@Component({
  selector: 'app-confirmar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotonComponent],
  template: `
    @if (abierto()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 anim-aparecer"
        style="background: rgba(90,56,32,0.4); backdrop-filter: blur(6px);"
        role="dialog"
        aria-modal="true"
      >
        <div class="w-full max-w-md rounded-3xl border border-calido-200/60 bg-white/90 p-6 shadow-2xl anim-escala"
             style="backdrop-filter: blur(16px) saturate(1.2);">
          <div class="flex items-start gap-3.5">
            @if (peligroso()) {
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-100 to-rose-50 text-rose-600 border border-rose-200/40">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
            } @else {
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-marca-100 to-amber-50 text-marca-700 border border-marca-200/40">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </div>
            }
            <div class="flex-1">
              <h2 class="text-lg font-bold text-stone-900 tracking-tight">{{ titulo() }}</h2>
              <p class="mt-1.5 text-sm text-stone-600 leading-relaxed font-medium">{{ mensaje() }}</p>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-2.5 border-t border-calido-100/60 pt-4">
            <app-boton variante="secundario" (click)="cancelado.emit()">
              {{ textoCancelar() }}
            </app-boton>
            <app-boton [variante]="peligroso() ? 'peligro' : 'primario'" (click)="confirmado.emit()">
              {{ textoConfirmar() }}
            </app-boton>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmarComponent {
  readonly abierto = input(false);
  readonly titulo = input('¿Confirmas?');
  readonly mensaje = input('');
  readonly textoConfirmar = input('Sí, continuar');
  readonly textoCancelar = input('Cancelar');
  readonly peligroso = input(false);

  readonly confirmado = output<void>();
  readonly cancelado = output<void>();
}
