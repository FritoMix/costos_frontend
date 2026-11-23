import type { RegistroHornoGuardar } from '../../../core/modelos/produccion.model';
import { numeroDeTexto } from './reglas-tanda';
import type { DatosTandaHorno } from './reglas-tanda';

/** Único adaptador del formulario al contrato HTTP, incluidas las órdenes históricas. */
export function construirRegistroHorno(
  datos: DatosTandaHorno,
  horario: { inicio: string; fin: string },
  numeroTanda: number | null = null,
): RegistroHornoGuardar {
  const paro = datos.hayParada === true && (datos.minutosParada ?? 0) > 0;
  const conDesperdicio =
    datos.tipoDesperdicioId !== null && numeroDeTexto(datos.cantidadDesperdicio) > 0;
  return {
    // La API pone la hora de la tanda n; el horario solo cuenta en órdenes sin hora de inicio.
    numero_tanda: numeroTanda,
    hora_inicio: horario.inicio,
    hora_fin: horario.fin,
    minutos_parada: paro ? datos.minutosParada! : 0,
    causa_parada: paro ? (datos.causaParada ?? null) : null,
    nota_parada: paro && datos.causaParada === 'otro' ? (datos.notaParada ?? '').trim() : null,
    referencias: datos.conFormula
      ? datos.mezcla
          .filter((fila) => fila.bultos > 0)
          .map((fila) => ({
            referencia_papa_id: fila.referencia_id,
            cantidad_bultos: fila.bultos,
          }))
      : [],
    referencia_papa_id: datos.conFormula ? undefined : datos.referenciaPapaId!,
    cantidad_bultos: datos.conFormula ? undefined : numeroDeTexto(datos.bultos),
    operarios_seleccion: datos.operariosSeleccion,
    operarios_horno: datos.operariosZonaHumeda,
    nivel_aceite_inicial_cm: numeroDeTexto(datos.aceiteInicial),
    nivel_aceite_final_cm: numeroDeTexto(datos.aceiteFinal),
    // Solo viaja si se repuso aceite: el cuerpo de siempre no cambia.
    ...(numeroDeTexto(datos.aceiteAgregado ?? '0') > 0
      ? { aceite_agregado_litros: numeroDeTexto(datos.aceiteAgregado ?? '0') }
      : {}),
    temperatura_aceite_c: numeroDeTexto(datos.temperatura),
    observaciones: null,
    tipo_desperdicio_id: conDesperdicio ? datos.tipoDesperdicioId : null,
    cantidad_desperdicio_kg: conDesperdicio ? numeroDeTexto(datos.cantidadDesperdicio) : null,
    observacion_desperdicio: null,
  };
}
