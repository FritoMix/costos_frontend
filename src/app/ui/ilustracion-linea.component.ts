import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Ícono de línea de cada línea de producción (papa, plátano, pellet,
 * extruido, trocillo, nachos), en un solo color y con trazo fino, al estilo de
 * un sistema industrial. Toma el color del texto (currentColor), así que se
 * adapta al estado de la tarjeta (normal, elegida o bloqueada).
 */
@Component({
  selector: 'app-ilustracion-linea',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block' },
  template: `
    <svg
      viewBox="0 0 48 48"
      [attr.width]="tamano()"
      [attr.height]="tamano()"
      fill="none"
      stroke="currentColor"
      stroke-width="2.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      role="img"
      [attr.aria-label]="nombre() || dibujo()"
      xmlns="http://www.w3.org/2000/svg"
    >
      @switch (dibujo()) {
        @case ('papa') {
          <!-- Hojuela ondulada -->
          <path d="M8 26c0-9 8-15 17-15s15 5 15 12-7 14-17 14S8 33 8 26z" />
          <path d="M13 22c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 7 0" />
          <path d="M13 29c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 6 0" />
        }
        @case ('platano') {
          <!-- Rodajas de plátano -->
          <circle cx="19" cy="21" r="11" />
          <circle cx="19" cy="21" r="4" />
          <path d="M28.5 15.8A11 11 0 1 1 25 38.6" />
          <circle cx="31" cy="30" r="3.5" />
        }
        @case ('pellet') {
          <!-- Pellet en rueda y en cuadro -->
          <circle cx="17" cy="19" r="10" />
          <circle cx="17" cy="19" r="3" />
          <path d="M17 9v7M17 22v7M7 19h7M20 19h7" />
          <rect x="25" y="27" width="16" height="13" rx="2.5" />
          <path d="M29 31.5h8M29 35.5h8" />
        }
        @case ('extruido') {
          <!-- Rizo de maíz extruido -->
          <path d="M9 31c0-11 9-19 19-19 6 0 11 3 11 8" />
          <path d="M17 33c0-7 5-12 11-12 3 0 5 1.5 5 4" />
          <path d="M9 31c0 1.2 1.8 2 4 2s4-.8 4-2M33 25c0-1.8 2.7-3 6-3" />
          <path d="M31 36h8M35 32v8" stroke-width="1.8" />
        }
        @case ('trocillo') {
          <!-- Trozos -->
          <rect x="7" y="15" width="16" height="13" rx="3" transform="rotate(-8 15 21.5)" />
          <rect x="25" y="11" width="15" height="12" rx="3" transform="rotate(10 32.5 17)" />
          <rect x="17" y="29" width="17" height="12" rx="3" transform="rotate(-4 25.5 35)" />
        }
        @case ('nachos') {
          <!-- Nacho -->
          <path d="M24 8 41 38H7z" />
          <path d="M24 20v.01M19 30v.01M29 30v.01M24 33v.01" stroke-width="3" />
        }
        @default {
          <!-- Empaque genérico -->
          <path d="M14 10h20l3 28H11z" />
          <path d="M14 10l-2-3h24l-2 3" />
          <path d="M18 22h12" />
        }
      }
    </svg>
  `,
})
export class IlustracionLineaComponent {
  /** Código de la línea: papa, platano, pellet, extruido, trocillo, nachos. */
  readonly codigo = input.required<string>();
  readonly nombre = input('');
  readonly tamano = input(26);

  protected readonly dibujo = computed(() => {
    const codigo = this.codigo().toLowerCase();
    if (codigo.startsWith('extruido')) return 'extruido';
    if (codigo === 'harinas') return 'nachos';
    return codigo;
  });
}
