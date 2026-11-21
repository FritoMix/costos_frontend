import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { ReferenciaPapa } from '../../../core/modelos/bodega.model';
import { textoParada } from '../../../core/modelos/paradas';
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
  /** "Parada 20 min · Falta de papa", o null si trabajó toda la hora. */
  protected readonly parada = computed(() => {
    const d = this.datos();
    return d.hayParada
      ? textoParada({
          minutos_parada: d.minutosParada,
          causa_parada: d.causaParada,
          nota_parada: d.notaParada,
        })
      : null;
  });
  protected readonly consumoCm = computed(() =>
    consumoAceiteCm(this.datos().aceiteInicial, this.datos().aceiteFinal),
  );
}
