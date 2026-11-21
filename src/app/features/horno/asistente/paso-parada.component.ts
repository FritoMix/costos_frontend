import { ChangeDetectionStrategy, Component, model } from '@angular/core';

import { CAUSAS_PARADA, MINUTOS_PARADA } from '../../../core/modelos/paradas';
import { colorTecla } from './presentacion-tanda';

/**
 * ¿El horno estuvo parado dentro de la hora? (V17). Primero sí/no; si paró,
 * los minutos de un toque y la causa. Explica por qué salieron menos bultos
 * y saborizado la ve en la misma hora.
 */
@Component({
  selector: 'app-paso-parada-horno',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  templateUrl: './paso-parada.component.html',
})
export class PasoParadaHornoComponent {
  readonly hayParada = model.required<boolean | null>();
  readonly minutos = model.required<number>();
  readonly causa = model.required<string | null>();
  readonly nota = model.required<string>();

  protected readonly opcionesMinutos = MINUTOS_PARADA;
  protected readonly causas = CAUSAS_PARADA;

  protected elegir(paro: boolean): void {
    this.hayParada.set(paro);
    if (!paro) {
      this.minutos.set(0);
      this.causa.set(null);
      this.nota.set('');
    }
  }

  protected claseOpcion(activo: boolean): string {
    const base =
      'flex flex-col items-center gap-1 rounded-3xl border-2 px-4 py-6 text-center font-bold transition active:scale-[0.98]';
    return activo
      ? `${base} border-marca-500 bg-marca-50/70 text-marca-900 ring-4 ring-marca-500/10`
      : `${base} border-slate-200 bg-white text-slate-700 hover:border-marca-300`;
  }

  protected claseMinutos(activo: boolean): string {
    const base =
      'flex h-14 w-16 shrink-0 items-center justify-center rounded-2xl border text-xl font-extrabold ' +
      'tabular-nums shadow-2xs transition active:scale-95';
    return `${base} ${colorTecla(activo)}`;
  }

  protected claseCausa(activo: boolean): string {
    const base =
      'rounded-2xl border-2 px-4 py-3 text-left text-sm font-bold transition active:scale-[0.99]';
    return activo
      ? `${base} border-marca-500 bg-marca-50/70 text-marca-900`
      : `${base} border-slate-200 bg-white text-slate-700 hover:border-marca-300`;
  }
}
