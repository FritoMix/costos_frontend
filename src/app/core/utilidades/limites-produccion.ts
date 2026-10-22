/**
 * Tiempo de produccion ya registrado en una orden.
 *
 * El backend es la fuente definitiva: estas funciones solo permiten avisar
 * antes de enviar una tanda o recepcion que no cabe en las horas de la orden.
 */
export interface RegistroConHorario {
  id: number;
  hora_inicio: string;
  hora_fin: string;
}

/** Minutos entre dos fechas ISO. Un rango invalido cuenta como cero. */
export function duracionMinutos(inicio: string, fin: string): number {
  const milisegundos = new Date(fin).getTime() - new Date(inicio).getTime();
  if (!Number.isFinite(milisegundos) || milisegundos <= 0) {
    return 0;
  }
  return Math.round(milisegundos / 60000);
}

/** Suma los registros activos, sin contar el que se esta corrigiendo. */
export function minutosRegistrados(
  registros: readonly RegistroConHorario[],
  excluirId: number | null = null,
): number {
  return registros.reduce(
    (total, registro) =>
      registro.id === excluirId
        ? total
        : total + duracionMinutos(registro.hora_inicio, registro.hora_fin),
    0,
  );
}

/**
 * Minutos que le quedan a la orden en ese modulo.
 * `null` significa que la orden es historica y no tiene horas configuradas.
 */
export function minutosDisponibles(
  horasProduccion: number | null | undefined,
  registros: readonly RegistroConHorario[],
  excluirId: number | null = null,
): number | null {
  if (horasProduccion == null) {
    return null;
  }
  return Math.max(0, horasProduccion * 60 - minutosRegistrados(registros, excluirId));
}

export function formatearMinutos(minutos: number): string {
  const valor = Math.max(0, Math.round(minutos));
  const horas = Math.floor(valor / 60);
  const resto = valor % 60;
  if (horas && resto) {
    return `${horas} h ${resto} min`;
  }
  if (horas === 1) {
    return '1 hora';
  }
  if (horas) {
    return `${horas} horas`;
  }
  return `${resto} min`;
}
