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
  /** Solo en el nivel final: litros agregados al tanque en la tanda (V18). */
  readonly pedirAgregado = input(false);
  readonly agregado = model('0');

  protected cambiarAgregado(texto: string): void {
    const limpio = texto.replace(',', '.').trim();
    this.agregado.set(limpio === '' ? '0' : limpio);
  }

  protected litrosAgregados(): number {
    const numero = Number(this.agregado());
    return Number.isFinite(numero) && numero > 0 ? numero : 0;
  }
}
