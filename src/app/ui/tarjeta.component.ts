import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Tarjeta blanca de DATACONTROL, con título, subtítulo y acciones opcionales.
 * Espaciado amplio y jerarquía visual nítida.
 */
@Component({
  selector: 'app-tarjeta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <section [class]="minimalista()
      ? 'rounded-xl border border-slate-200 bg-white overflow-hidden'
      : 'tarjeta overflow-hidden'">
      @if (titulo() || subtitulo()) {
        <header
          class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:px-6"
        >
          <div class="min-w-0">
            @if (titulo()) {
              <h2 class="text-lg font-bold tracking-tight text-marca-950">{{ titulo() }}</h2>
            }
            @if (subtitulo()) {
              <p class="mt-0.5 text-sm text-slate-600">{{ subtitulo() }}</p>
            }
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <ng-content select="[acciones]" />
          </div>
        </header>
      }
      <div [class]="sinRelleno() ? '' : 'p-5 sm:p-6'">
        <ng-content />
      </div>
    </section>
  `,
})
export class TarjetaComponent {
  readonly minimalista = input(false);
  readonly titulo = input<string>('');
  readonly subtitulo = input<string>('');
  /** Para tablas o listados que traen su propio espaciado interno */
  readonly sinRelleno = input(false);
}
