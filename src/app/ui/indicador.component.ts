import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type TonoIndicador = 'neutral' | 'marca' | 'verde' | 'azul' | 'ambar' | 'morado' | 'rojo';

/**
 * Indicador (KPI): tarjeta blanca con el valor grande; el tono colorea el ícono.
 */
@Component({
  selector: 'app-indicador',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  imports: [DecimalPipe],
  template: `
    @if (minimalista()) {
      <div class="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-sm font-medium text-slate-700">{{ nombre() }}</p>
        <p class="mt-2 flex flex-wrap items-baseline gap-x-2 text-2xl font-semibold tabular-nums text-slate-900">
          {{ (valor() | number: '1.0-2') ?? '—' }}
          @if (valor() != null && unidad()) {
            <span class="text-sm font-medium text-slate-600">{{ unidad() }}</span>
          }
        </p>
        @if (valor() == null && faltante()) {
          <p class="mt-1 text-xs text-slate-700">{{ faltante() }}</p>
        }
        @if (subtexto()) {
          <p class="mt-auto pt-2 text-xs leading-relaxed text-slate-600">{{ subtexto() }}</p>
        }
      </div>
    } @else {
      <div
        class="group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 shadow-sm transition-shadow duration-200 hover:shadow-md"
        [style]="estiloContenedor()"
      >

        <!-- Top header con título e ícono -->
        <div class="relative flex items-start justify-between gap-3">
          <p class="text-xs font-extrabold uppercase tracking-wider leading-tight" [style]="estiloTituloTexto()">
            {{ nombre() }}
          </p>
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
            [style]="estiloIconoFondo()"
          >
            <span [style]="estiloIconoColor()" [innerHTML]="svgIcono()"></span>
          </div>
        </div>

        <!-- Valor principal con unidad -->
        <div class="mt-4 relative">
          @if (valor() === null || valor() === undefined) {
            <div class="flex items-baseline gap-2">
              <span class="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight opacity-40">—</span>
            </div>
            @if (faltante()) {
              <p class="mt-2 text-xs font-semibold px-2.5 py-1 rounded-lg border inline-block" [style]="estiloFaltante()">
                {{ faltante() }}
              </p>
            }
          } @else {
            <div class="flex items-baseline gap-2 flex-wrap">
              <span class="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-mono tracking-tight tabular-nums" [style]="estiloValorTexto()">
                {{ valor() | number: '1.0-2' }}
              </span>
              @if (unidad()) {
                <span class="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border" [style]="estiloUnidad()">
                  {{ unidad() }}
                </span>
              }
            </div>
          }
        </div>

        @if (subtexto()) {
          <p class="mt-3 text-sm font-medium border-t pt-2.5 relative" [style]="estiloSubtexto()">
            {{ subtexto() }}
          </p>
        }
      </div>
    }
  `,
})
export class IndicadorComponent {
  readonly nombre = input.required<string>();
  readonly valor = input<number | null | undefined>(null);
  readonly unidad = input('');
  readonly faltante = input('');
  readonly subtexto = input('');
  readonly minimalista = input(false);
  readonly tono = input<TonoIndicador>('neutral');
  readonly icono = input<string>('');

  /** Paletas de color intensas por tono */
  /** Tarjeta blanca; el tono solo pinta el ícono. */
  private readonly paleta = computed(() => {
    switch (this.tono()) {
      case 'azul':
      case 'verde':
      case 'morado':
        return {
          bg: '#ffffff',
          border: '#e2e8f0',
          iconBg: '#0369a1',
          iconBorder: '#075985',
          iconColor: '#ffffff',
          titleColor: '#475569',
          valueColor: '#08283e',
          unitBg: '#f1f5f9',
          unitBorder: '#e2e8f0',
          unitColor: '#334155',
          subtextBorder: '#f1f5f9',
          subtextColor: '#475569',
          accent: '#0284c7',
          faltanteBg: '#f8fafc',
          faltanteBorder: '#e2e8f0',
          faltanteColor: '#475569',
        };
      case 'ambar':
      case 'marca':
      case 'rojo':
        return {
          bg: '#ffffff',
          border: '#e2e8f0',
          iconBg: '#b45309',
          iconBorder: '#92400e',
          iconColor: '#ffffff',
          titleColor: '#475569',
          valueColor: '#08283e',
          unitBg: '#f1f5f9',
          unitBorder: '#e2e8f0',
          unitColor: '#334155',
          subtextBorder: '#f1f5f9',
          subtextColor: '#475569',
          accent: '#d97706',
          faltanteBg: '#f8fafc',
          faltanteBorder: '#e2e8f0',
          faltanteColor: '#475569',
        };
      default: // neutral
        return {
          bg: '#ffffff',
          border: '#e2e8f0',
          iconBg: '#475569',
          iconBorder: '#334155',
          iconColor: '#ffffff',
          titleColor: '#475569',
          valueColor: '#08283e',
          unitBg: '#f1f5f9',
          unitBorder: '#e2e8f0',
          unitColor: '#334155',
          subtextBorder: '#f1f5f9',
          subtextColor: '#475569',
          accent: '#94a3b8',
          faltanteBg: '#f8fafc',
          faltanteBorder: '#e2e8f0',
          faltanteColor: '#475569',
        };
    }
  });

  protected estiloContenedor = computed(() =>
    `background: ${this.paleta().bg}; border-color: ${this.paleta().border};`
  );

  protected glowStyle = computed(() =>
    `background: ${this.paleta().accent};`
  );

  protected estiloIconoFondo = computed(() =>
    `background: ${this.paleta().iconBg}; border-color: ${this.paleta().iconBorder};`
  );

  protected estiloIconoColor = computed(() =>
    `color: ${this.paleta().iconColor};`
  );

  protected estiloTituloTexto = computed(() =>
    `color: ${this.paleta().titleColor};`
  );

  protected estiloValorTexto = computed(() =>
    `color: ${this.paleta().valueColor};`
  );

  protected estiloUnidad = computed(() =>
    `background: ${this.paleta().unitBg}; border-color: ${this.paleta().unitBorder}; color: ${this.paleta().unitColor};`
  );

  protected estiloSubtexto = computed(() =>
    `border-color: ${this.paleta().subtextBorder}; color: ${this.paleta().subtextColor};`
  );

  protected estiloFaltante = computed(() =>
    `background: ${this.paleta().faltanteBg}; border-color: ${this.paleta().faltanteBorder}; color: ${this.paleta().faltanteColor};`
  );

  protected readonly svgIcono = computed(() => {
    const custom = this.icono();
    if (custom) return custom;

    const nombreLow = this.nombre().toLowerCase();
    if (nombreLow.includes('orden')) {
      return '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>';
    }
    if (nombreLow.includes('cruda') || nombreLow.includes('materia')) {
      return '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>';
    }
    if (nombreLow.includes('frita') || nombreLow.includes('terminado')) {
      return '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
    }
    if (nombreLow.includes('aceite')) {
      return '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>';
    }
    if (nombreLow.includes('rendimiento')) {
      return '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>';
    }
    if (nombreLow.includes('absorción') || nombreLow.includes('absorcion')) {
      return '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>';
    }
    if (nombreLow.includes('desperdicio') || nombreLow.includes('merma')) {
      return '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>';
    }
    return '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>';
  });
}
