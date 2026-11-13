/** Tipos del modulo Produccion. */

import type { EstadoFormula, Formula } from './formula.model';

export type EstadoOrden = 'pendiente' | 'en_produccion' | 'finalizada' | 'cancelada';
export type DestinoOrden = 'nacional' | 'exportacion';
export type UnidadSolicitada = 'kg' | 'canastillas';

export interface Referencia {
  id: number;
  nombre: string;
}

export interface ProductoRef {
  id: number;
  nombre_comercial: string;
}

export interface UsuarioRef {
  id: number;
  nombre_completo: string;
}

export interface ReferenciaPapaRef {
  id: number;
  nombre: string;
  tipo: string | null;
  peso_promedio_bulto_kg: number;
  rendimiento_fritura_pct: number | null;
  porcentaje_produccion_pct: number | null;
}

export interface Orden {
  id: number;
  numero_orden: string;
  fecha: string;
  estado: EstadoOrden;
  estado_etiqueta: string;
  destino: DestinoOrden;
  destino_etiqueta: string;
  cantidad_programada: number;
  unidad_solicitada: UnidadSolicitada;
  cantidad_canastillas_solicitadas: number | null;
  /** Horas programadas de producción (mínimo 1). Null en órdenes antiguas. */
  horas_produccion: number | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  /** Estado de la fórmula de la orden (no confundir con el estado de la orden). */
  formula_estado: EstadoFormula;
  /** Las órdenes nuevas exigen fórmula antes de iniciar; las históricas no. */
  formula_obligatoria: boolean;
  supervisor: UsuarioRef;
  turno: Referencia;
  horno: Referencia;
  producto: ProductoRef;
  categoria: Referencia;
}

export interface OrdenGuardar {
  turno_id: number;
  horno_id: number;
  categoria_id: number;
  producto_id: number;
  destino: DestinoOrden;
  unidad_solicitada: UnidadSolicitada;
  cantidad_kg: number | null;
  cantidad_canastillas: number | null;
  horas_produccion: number | null;
}

export interface Desperdicio {
  id: number;
  tipo_desperdicio_id: number;
  cantidad_kg: number;
  observacion: string | null;
  tipo_desperdicio: Referencia;
}

export interface RegistroReferencia {
  referencia_papa_id: number;
  nombre: string;
  cantidad_bultos: number;
  peso_estandar_bulto_kg: number;
  rendimiento_fritura_pct: number | null;
  porcentaje_produccion_pct: number | null;
  kg_crudos_calculados: number;
  kg_fritos_estimados: number | null;
}

export interface RegistroHorno {
  id: number;
  orden_id: number;
  hora_inicio: string;
  hora_fin: string;
  /** Referencia única de las órdenes históricas; en tandas nuevas va en `referencias`. */
  referencia_papa: ReferenciaPapaRef | null;
  referencias: RegistroReferencia[];
  cantidad_bultos: number;
  peso_estandar_bulto_kg: number | null;
  rendimiento_fritura_pct: number | null;
  porcentaje_produccion_pct: number | null;
  kg_crudos_calculados: number;
  kg_fritos_estimados: number | null;
  operarios_seleccion: number;
  operarios_horno: number;
  nivel_aceite_inicial_cm: number;
  nivel_aceite_final_cm: number;
  diferencia_aceite_cm: number;
  temperatura_aceite_c: number | null;
  litros_por_cm_usado: number | null;
  volumen_aceite_litros: number | null;
  densidad_aceite_usada: number | null;
  kg_aceite_consumido: number | null;
  observaciones: string | null;
  fecha_creacion: string;
  usuario: UsuarioRef;
  desperdicios: Desperdicio[];
}

export interface RegistroReferenciaGuardar {
  referencia_papa_id: number;
  cantidad_bultos: number;
}

export interface RegistroHornoGuardar {
  hora_inicio: string;
  hora_fin: string;
  /** Mezcla de la tanda. En órdenes históricas se admite la referencia única. */
  referencias: RegistroReferenciaGuardar[];
  referencia_papa_id?: number;
  cantidad_bultos?: number;
  operarios_seleccion: number;
  operarios_horno: number;
  nivel_aceite_inicial_cm: number;
  nivel_aceite_final_cm: number;
  temperatura_aceite_c: number;
  observaciones: string | null;
  tipo_desperdicio_id: number | null;
  cantidad_desperdicio_kg: number | null;
  observacion_desperdicio: string | null;
}

export interface Canastilla {
  numero: number;
  peso_kg: number;
}

export interface Recepcion {
  id: number;
  orden_id: number;
  hora_inicio: string;
  hora_fin: string;
  cantidad_sabor_kg: number;
  kg_recibidos: number;
  fecha_creacion: string;
  sabor: Referencia;
  turno: Referencia;
  usuario: UsuarioRef;
  canastillas: Canastilla[];
}

export interface RecepcionGuardar {
  hora_inicio: string;
  hora_fin: string;
  sabor_id: number;
  cantidad_sabor_kg: number;
  pesos_canastillas: number[];
}

export interface TotalesOrden {
  kg_crudos: number;
  cantidad_bultos: number;
  kg_fritos_estimados: number;
  kg_papa_frita: number;
  kg_aceite: number;
  kg_desperdicio: number;
  avance_porcentaje: number | null;
}

export interface DetalleOrden {
  orden: Orden;
  totales: TotalesOrden;
  formula: Formula | null;
  registros_horno: RegistroHorno[];
  recepciones: Recepcion[];
}

export interface PaginaOrdenes {
  items: Orden[];
  total: number;
  pagina: number;
  tamano: number;
}
