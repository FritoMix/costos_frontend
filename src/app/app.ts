import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AvisoActualizacionComponent } from './layout/aviso-actualizacion.component';

/**
 * Componente raiz. Dibuja la ruta actual (el marco de la app esta en
 * ShellComponent) y el aviso de nuevas versiones de la PWA.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, AvisoActualizacionComponent],
  template: '<router-outlet /><app-aviso-actualizacion />',
})
export class App {}
