import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Contenedor tarjeta con glassmorphism cálido, soporte para título, subtítulo, badges y acciones.
 * Espaciado amplio y jerarquía visual nítida.
 */
@Component({
  selector: 'app-tarjeta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="tarjeta overflow-hidden">
      @if (titulo() || subtitulo()) {
        <header
          class="flex flex-wrap items-center justify-between gap-3 border-b border-calido-100/80 px-6 py-4.5"
          style="background: linear-gradient(135deg, rgba(250,245,238,0.6) 0%, rgba(255,249,240,0.4) 100%);"
        >
          <div class="min-w-0">
            @if (titulo()) {
              <h2 class="text-base font-extrabold tracking-tight text-stone-900">{{ titulo() }}</h2>
            }
            @if (subtitulo()) {
              <p class="mt-0.5 text-xs text-stone-500 font-medium">{{ subtitulo() }}</p>
            }
          </div>
          <div class="flex flex-wrap items-center gap-2.5">
            <ng-content select="[acciones]" />
          </div>
        </header>
      }
      <div [class]="sinRelleno() ? '' : 'p-6 sm:p-7'">
        <ng-content />
      </div>
    </section>
  `,
})
export class TarjetaComponent {
  readonly titulo = input<string>('');
  readonly subtitulo = input<string>('');
  /** Para tablas o listados que traen su propio espaciado interno */
  readonly sinRelleno = input(false);
}
