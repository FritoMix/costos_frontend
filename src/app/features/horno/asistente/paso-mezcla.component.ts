import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { barraCapacidad, kgFritosDeFila, resumirMezcla } from './proyeccion-mezcla';
import type { FilaMezclaTanda } from './reglas-tanda';

@Component({
  selector: 'app-paso-mezcla-horno',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  imports: [DecimalPipe, FormsModule],
  templateUrl: './paso-mezcla.component.html',
})
export class PasoMezclaHornoComponent {
  readonly filas = input.required<readonly FilaMezclaTanda[]>();
  readonly capacidad = input<number | null>(null);
  readonly completa = input(false);
  readonly bultosCambiados = output<{ indice: number; bultos: number | string | null }>();
  protected readonly totales = computed(() => resumirMezcla(this.filas()));
  protected readonly limite = computed(() => Number(this.capacidad() ?? Infinity));
  protected readonly barra = computed(() =>
    barraCapacidad(this.capacidad(), this.totales().bultos),
  );
  protected readonly kgFritosDeFila = kgFritosDeFila;

  protected cambiarBultos(indice: number, bultos: number | string | null): void {
    this.bultosCambiados.emit({ indice, bultos });
  }
}
