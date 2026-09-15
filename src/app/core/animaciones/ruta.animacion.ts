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
    // Las dos pantallas conviven un instante; se superponen sin empujar.
    query(':enter, :leave', [style({ position: 'absolute', width: '100%' })], { optional: true }),
    query(':enter', [style({ opacity: 0, transform: 'translateY(12px)' })], { optional: true }),
    group([
      query(
        ':leave',
        [animate('180ms ease', style({ opacity: 0, transform: 'translateY(-6px)' }))],
        { optional: true },
      ),
      query(
        ':enter',
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
