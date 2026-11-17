import {
  calcularKgCrudosPreview,
  calcularKgFritosPreview,
} from '../../../core/utilidades/calculos-produccion';
import type { FilaMezclaTanda } from './reglas-tanda';

/** Proyecciones de pantalla: la API sigue calculando los valores definitivos con Decimal. */
export function kgFritosDeFila(fila: FilaMezclaTanda): number {
  return calcularKgFritosPreview(
    calcularKgCrudosPreview(fila.bultos, fila.peso_promedio_bulto_kg),
    fila.rendimiento_fritura_pct,
  );
}

export function resumirMezcla(filas: readonly FilaMezclaTanda[]) {
  return filas.reduce(
    (total, fila) => ({
      bultos: total.bultos + fila.bultos,
      kgCrudos: total.kgCrudos + calcularKgCrudosPreview(fila.bultos, fila.peso_promedio_bulto_kg),
      kgFritos: total.kgFritos + kgFritosDeFila(fila),
    }),
    { bultos: 0, kgCrudos: 0, kgFritos: 0 },
  );
}

export function barraCapacidad(capacidad: number | null, total: number) {
  if (!capacidad) return { porcentaje: 0, clase: 'bg-emerald-400' };
  if (total > capacidad) return { porcentaje: 100, clase: 'bg-rose-500' };
  const porcentaje = Math.min(100, (total / capacidad) * 100);
  return { porcentaje, clase: porcentaje >= 90 ? 'bg-amber-400' : 'bg-emerald-400' };
}

/** Único ajuste de estado: respeta restante, no modifica filas y conserva las demás referencias. */
export function cambiarBultosMezcla(
  filas: readonly FilaMezclaTanda[],
  indice: number,
  bultos: number | string | null,
): FilaMezclaTanda[] {
  const valor = Number(bultos);
  return filas.map((fila, posicion) =>
    posicion !== indice
      ? fila
      : {
          ...fila,
          bultos: Math.max(0, Math.min(fila.restante, Number.isFinite(valor) ? valor : 0)),
        },
  );
}
