import type { RegistroHornoGuardar } from '../../../core/modelos/produccion.model';
import { numeroDeTexto } from './reglas-tanda';
import type { DatosTandaHorno } from './reglas-tanda';

/** Único adaptador del formulario al contrato HTTP, incluidas las órdenes históricas. */
export function construirRegistroHorno(
  datos: DatosTandaHorno,
  horario: { inicio: string; fin: string },
): RegistroHornoGuardar {
  const conDesperdicio =
    datos.tipoDesperdicioId !== null && numeroDeTexto(datos.cantidadDesperdicio) > 0;
  return {
    hora_inicio: horario.inicio,
    hora_fin: horario.fin,
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
    temperatura_aceite_c: numeroDeTexto(datos.temperatura),
    observaciones: null,
    tipo_desperdicio_id: conDesperdicio ? datos.tipoDesperdicioId : null,
    cantidad_desperdicio_kg: conDesperdicio ? numeroDeTexto(datos.cantidadDesperdicio) : null,
    observacion_desperdicio: null,
  };
}
