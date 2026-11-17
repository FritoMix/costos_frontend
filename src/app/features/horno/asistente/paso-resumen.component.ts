import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { ReferenciaPapa } from '../../../core/modelos/bodega.model';
import {
  calcularKgCrudosPreview,
  calcularKgFritosPreview,
} from '../../../core/utilidades/calculos-produccion';
import { resumirMezcla } from './proyeccion-mezcla';
import { consumoAceiteCm, numeroDeTexto } from './reglas-tanda';
import type { DatosTandaHorno } from './reglas-tanda';

@Component({
  selector: 'app-paso-resumen-horno',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  imports: [DecimalPipe],
  templateUrl: './paso-resumen.component.html',
})
export class PasoResumenHornoComponent {
  readonly datos = input.required<Readonly<DatosTandaHorno>>();
  readonly referencia = input<ReferenciaPapa | null>(null);
  readonly horaInicio = input.required<string>();
  readonly horaFin = input.required<string>();
  readonly nombreDesperdicio = input('');
  protected readonly numero = numeroDeTexto;
  protected readonly totales = computed(() => resumirMezcla(this.datos().mezcla));
  protected readonly kgCrudos = computed(() =>
    calcularKgCrudosPreview(
      numeroDeTexto(this.datos().bultos),
      Number(this.referencia()?.peso_promedio_bulto_kg ?? 0),
    ),
  );
  protected readonly kgFritos = computed(() =>
    calcularKgFritosPreview(this.kgCrudos(), this.referencia()?.rendimiento_fritura_pct),
  );
  protected readonly consumoCm = computed(() =>
    consumoAceiteCm(this.datos().aceiteInicial, this.datos().aceiteFinal),
  );
}
