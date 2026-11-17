import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { TecladoNumericoComponent } from '../../../ui/teclado-numerico.component';

@Component({
  selector: 'app-paso-aceite-horno',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  imports: [DecimalPipe, TecladoNumericoComponent],
  templateUrl: './paso-aceite.component.html',
})
export class PasoAceiteHornoComponent {
  readonly valor = model.required<string>();
  readonly consumoCm = input<number | null>(null);
}
