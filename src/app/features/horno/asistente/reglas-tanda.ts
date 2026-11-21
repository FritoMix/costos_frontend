import type { PasoTanda } from './pasos-tanda';

/** Mezcla que el operario ajusta, basada en la copia de la fórmula de la orden. */
export interface FilaMezclaTanda {
  referencia_id: number;
  nombre: string;
  bultos_por_tanda: number;
  producido: number;
  restante: number;
  peso_promedio_bulto_kg: number;
  rendimiento_fritura_pct: number | null;
  bultos: number;
}

/** Instantánea del formulario. Estas funciones no conocen Angular, HTTP ni servicios. */
export interface DatosTandaHorno {
  conFormula: boolean;
  referenciaPapaId: number | null;
  mezcla: readonly FilaMezclaTanda[];
  bultos: string;
  temperatura: string;
  operariosSeleccion: number;
  operariosZonaHumeda: number;
  aceiteInicial: string;
  aceiteFinal: string;
  hayDesperdicio: boolean;
  tipoDesperdicioId: number | null;
  cantidadDesperdicio: string;
  /** Parada dentro de la hora (V17). null = aún no contestó. */
  hayParada?: boolean | null;
  minutosParada?: number;
  causaParada?: string | null;
  notaParada?: string;
}

export function numeroDeTexto(texto: string): number {
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : 0;
}

export function consumoAceiteCm(inicial: string, final: string): number | null {
  const inicio = numeroDeTexto(inicial);
  if (inicio <= 0) return null;
  return Math.round((inicio - numeroDeTexto(final)) * 100) / 100;
}

/** Conserva los criterios actuales de avance; la API mantiene la autoridad de negocio. */
export function pasoTandaValido(
  paso: PasoTanda,
  datos: DatosTandaHorno,
  capacidad: number,
): boolean {
  switch (paso) {
    case 'mezcla': {
      const total = datos.mezcla.reduce((suma, fila) => suma + fila.bultos, 0);
      return (
        total > 0 &&
        total <= capacidad &&
        datos.mezcla.every((fila) => fila.bultos >= 0 && fila.bultos <= fila.restante)
      );
    }
    case 'referencia_papa':
      return datos.referenciaPapaId !== null;
    case 'bultos':
      return numeroDeTexto(datos.bultos) > 0;
    case 'temperatura':
      return numeroDeTexto(datos.temperatura) > 0;
    case 'personal_zona_humeda':
      return datos.operariosZonaHumeda > 0;
    case 'personal_seleccion':
      return datos.operariosSeleccion > 0;
    case 'aceite_inicial':
      return numeroDeTexto(datos.aceiteInicial) > 0;
    case 'aceite_final':
      return (
        numeroDeTexto(datos.aceiteFinal) >= 0 &&
        (consumoAceiteCm(datos.aceiteInicial, datos.aceiteFinal) ?? -1) >= 0
      );
    case 'desperdicio':
      return (
        !datos.hayDesperdicio ||
        (datos.tipoDesperdicioId !== null && numeroDeTexto(datos.cantidadDesperdicio) > 0)
      );
    case 'parada':
      return (
        datos.hayParada === false ||
        (datos.hayParada === true &&
          (datos.minutosParada ?? 0) > 0 &&
          (datos.minutosParada ?? 0) <= 60 &&
          !!datos.causaParada &&
          (datos.causaParada !== 'otro' || !!datos.notaParada?.trim()))
      );
    case 'horario':
    case 'resumen':
      return true;
  }
}
