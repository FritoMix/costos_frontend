import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Íconos de línea de DATACONTROL. Reemplazan a los emojis: se ven igual en
 * todas las tabletas, toman el color del texto (currentColor) y escalan sin
 * perder nitidez.
 *
 * Uso: <app-icono nombre="llama" />  ·  <app-icono nombre="alerta" [tamano]="16" />
 */
const ICONOS = {
  llama: ['M12 3c2.5 3 5 5.5 5 9.5a5 5 0 0 1-10 0c0-2 .8-3.4 2-4.5.2 1.8 1 3 2.2 3.3C11 8 11 5.5 12 3z'],
  fabrica: ['M3 21V10l5 3v-3l5 3V6l8-3v18H3z', 'M7 17h2', 'M12 17h2', 'M17 17h1'],
  mundo: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M3 12h18', 'M12 3a14 14 0 0 1 0 18', 'M12 3a14 14 0 0 0 0 18'],
  reloj: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7v5l3 2'],
  balanza: ['M12 3v18', 'M6 21h12', 'M4 7h16', 'M7 7l-3 7a3 3 0 0 0 6 0z', 'M17 7l-3 7a3 3 0 0 0 6 0z'],
  canasta: ['M3 10h18l-2 10H5z', 'M7 10l3-6', 'M17 10l-3-6', 'M9 14v3', 'M15 14v3'],
  cuenco: ['M3 11h18a9 9 0 0 1-18 0z', 'M8 20h8'],
  barril: [
    'M5 5c0-1.1 3.1-2 7-2s7 .9 7 2v14c0 1.1-3.1 2-7 2s-7-.9-7-2z',
    'M5 5c0 1.1 3.1 2 7 2s7-.9 7-2',
    'M5 12c0 1.1 3.1 2 7 2s7-.9 7-2',
  ],
  caja: ['M3 7l9-4 9 4-9 4-9-4z', 'M3 7v10l9 4 9-4V7', 'M12 11v10'],
  numero: ['M4 9h16', 'M4 15h16', 'M10 3L8 21', 'M16 3l-2 18'],
  documento: ['M7 3h7l5 5v13H7z', 'M14 3v5h5', 'M10 13h6', 'M10 17h6'],
  portapapeles: ['M9 3h6v3H9z', 'M7 4.5H5V21h14V4.5h-2', 'M8 11h8', 'M8 15h6'],
  usuario: ['M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M4 21c0-4 4-6 8-6s8 2 8 6'],
  bandeja: ['M4 13h4l2 3h4l2-3h4', 'M4 13l3-8h10l3 8v6H4z'],
  bulto: ['M8 3h8l-1 3c3 2 5 5 5 9a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6c0-4 2-7 5-9z', 'M9 6h6'],
  salero: ['M8 9h8l1 12H7z', 'M9 9V6a3 3 0 0 1 6 0v3', 'M11 5.5h.01', 'M13 5.5h.01'],
  lapiz: ['M4 20h4L19 9l-4-4L4 16z', 'M14 6l4 4'],
  mas: ['M12 5v14', 'M5 12h14'],
  basura: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
  engranaje: [
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    'M12 2v3', 'M12 19v3', 'M2 12h3', 'M19 12h3',
    'M4.9 4.9l2.1 2.1', 'M17 17l2.1 2.1', 'M4.9 19.1L7 17', 'M17 7l2.1-2.1',
    'M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z',
  ],
  etiqueta: ['M3 12V4h8l10 10-8 8z', 'M7.5 7.5h.01'],
  regla: ['M3 17L17 3l4 4L7 21z', 'M7 13l2 2', 'M10 10l2 2', 'M13 7l2 2'],
  avion: ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4z'],
  alerta: [
    'M12 9v4', 'M12 17h.01',
    'M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  ],
  check: ['M5 12l5 5 9-11'],
  checkCirculo: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M8 12l3 3 5-6'],
  info: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 11v5', 'M12 8h.01'],
  luna: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
  probeta: ['M9 3h6', 'M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2L14 9V3', 'M7 15h10'],
  grafica: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  alto: ['M8 3h8l5 5v8l-5 5H8l-5-5V8z', 'M12 8v5', 'M12 16h.01'],
  candado: ['M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  llave: ['M8 11a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M11 12l9-9', 'M17 6l3 3'],
  gota: ['M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z'],
  hoja: ['M5 21c0-9 5-15 15-16-1 10-7 15-15 16z', 'M5 21l8-8'],
  flechaDerecha: ['M5 12h14', 'M13 6l6 6-6 6'],
  calendario: ['M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1z', 'M4 10h16', 'M8 3v4', 'M16 3v4'],
} as const;

export type NombreIcono = keyof typeof ICONOS;

@Component({
  selector: 'app-icono',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0 items-center justify-center', 'aria-hidden': 'true' },
  template: `
    <svg
      [attr.width]="tamano()"
      [attr.height]="tamano()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="grosor()"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      @for (d of trazos(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
})
export class IconoComponent {
  readonly nombre = input.required<NombreIcono>();
  readonly tamano = input(20);
  readonly grosor = input(1.8);
  protected readonly trazos = computed(() => ICONOS[this.nombre()] ?? []);
}
