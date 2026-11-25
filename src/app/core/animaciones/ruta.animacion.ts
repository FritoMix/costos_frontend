import { animate, group, query, style, transition, trigger } from '@angular/animations';

/**
 * Transición entre pantallas al navegar.
 *
 * La pantalla que entra aparece deslizándose un poco hacia arriba mientras
 * se desvanece la anterior. Es un movimiento corto (350 ms) y discreto: da
 * sensación de fluidez sin hacer esperar a nadie.
 *
 * Se aplica al contenedor del <router-outlet> en el shell.
 */
export const animacionRuta = trigger('animacionRuta', [
  transition('* => *', [
    // La vista entrante mantiene la altura del contenido. La saliente se superpone dentro de la ruta.
    query(':scope > :leave', [style({ position: 'absolute', top: 0, left: 0, width: '100%', pointerEvents: 'none' })], { optional: true }),
    query(':scope > :enter', [style({ opacity: 0, transform: 'translateY(12px)' })], { optional: true }),
    group([
      query(
        ':scope > :leave',
        [animate('180ms ease', style({ opacity: 0, transform: 'translateY(-6px)' }))],
        { optional: true },
      ),
      query(
        ':scope > :enter',
        [
          animate(
            '350ms 90ms cubic-bezier(0.16, 0.84, 0.44, 1)',
            style({ opacity: 1, transform: 'translateY(0)' }),
          ),
        ],
        { optional: true },
      ),
    ]),
  ]),
]);
