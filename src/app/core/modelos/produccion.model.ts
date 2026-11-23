/** Tipos del modulo Produccion. */

import type { EstadoFormula, Formula } from './formula.model';

export type EstadoOrden = 'pendiente' | 'en_produccion' | 'finalizada' | 'cancelada';
export type DestinoOrden = 'nacional' | 'exportacion';
export type UnidadSolicitada = 'kg' | 'canastillas' | 'mojes' | 'baches' | 'bultos';

/** Unidades que se piden contando (enteros), sin kg: trocillo, extruido, pellet. */
export const UNIDADES_DE_CONTEO: UnidadSolicitada[] = ['mojes', 'baches', 'bultos'];

/** Cómo se dice cada unidad en pantalla. */
export const NOMBRE_UNIDAD: Record<UnidadSolicitada, string> = {
  kg: 'Kilos',
  canastillas: 'Canastillas',
  mojes: 'Mojes',
  baches: 'Baches',
  bultos: 'Bultos crudos',
};

/** Línea de la orden (la de su horno), tal como la devuelve la API. */
export interface LineaOrden {
  id: number;
  codigo: string;
  nombre: string;
  unidad_materia_prima: 'bultos' | 'kg';
  nombre_materia_prima: string;
  usa_bodega: boolean;
  pide_variedad: boolean;
  unidades_orden: UnidadSolicitada[];
}

export interface Referencia {
  id: number;
  nombre: string;
}

export interface ProductoRef {
  id: number;
  nombre_comercial: string;
  /** Rango de % de sabor esperado (V21). */
  sabor_minimo_pct?: number | null;
  sabor_maximo_pct?: number | null;
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
  /** Cuántas se pidieron en la unidad del supervisor (canastillas, mojes, baches o bultos). */
  cantidad_canastillas_solicitadas: number | null;
  /** La meta como se pidió: "600 kg", "3 baches", "50 canastillas (300 kg)". */
  meta_texto?: string;
  /** Línea de la orden y variedad de la materia prima (V21). */
  linea?: LineaOrden | null;
  variedad?: Referencia | null;
  /** Horas programadas de producción (mínimo 1). Null en órdenes antiguas. */
  horas_produccion: number | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  /** Estado de la fórmula de la orden (no confundir con el estado de la orden). */
  formula_estado: EstadoFormula;
  /** Las órdenes nuevas exigen fórmula antes de iniciar; las históricas no. */
  formula_obligatoria: boolean;
  /** La puso la app con la fórmula de la noche; Bodega debe confirmarla. */
  formula_automatica?: boolean;
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
  /** Mojes, baches o bultos pedidos (enteros). */
  cantidad_unidades?: number | null;
  /** Variedad de la materia prima, en las líneas que la piden (plátano). */
  variedad_id?: number | null;
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
  /** Qué hora de la orden es esta tanda: 1, 2, ... (V17). */
  numero_tanda?: number | null;
  hora_inicio: string;
  hora_fin: string;
  minutos_parada?: number;
  causa_parada?: string | null;
  nota_parada?: string | null;
  /** Avisos para el supervisor: parada, pocos bultos, registro tardío. */
  alertas?: string[];
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
  aceite_agregado_litros?: number;
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
  /** La app pone la hora de la tanda n; solo las órdenes sin hora de inicio la envían. */
  numero_tanda?: number | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  minutos_parada?: number;
  causa_parada?: string | null;
  nota_parada?: string | null;
  /** Mezcla de la tanda. En órdenes históricas se admite la referencia única. */
  referencias: RegistroReferenciaGuardar[];
  referencia_papa_id?: number;
  cantidad_bultos?: number;
  /** Líneas que no son papa: kilos de materia prima que entraron (V21). */
  kg_materia_prima?: number;
  operarios_seleccion: number;
  operarios_horno: number;
  nivel_aceite_inicial_cm: number;
  nivel_aceite_final_cm: number;
  /** Litros agregados al tanque en la tanda (V18). */
  aceite_agregado_litros?: number;
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
  numero_tanda?: number | null;
  hora_inicio: string;
  hora_fin: string;
  minutos_parada?: number;
  causa_parada?: string | null;
  nota_parada?: string | null;
  alertas?: string[];
  /** Sabor sobre lo recibido, en % (V21). */
  porcentaje_sabor?: number | null;
  cantidad_sabor_kg: number;
  kg_recibidos: number;
  fecha_creacion: string;
  sabor: Referencia;
  turno: Referencia;
  usuario: UsuarioRef;
  canastillas: Canastilla[];
}

export interface RecepcionGuardar {
  numero_tanda?: number | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  sabor_id: number;
  cantidad_sabor_kg: number;
  pesos_canastillas: number[];
}

export interface ResumenInicioProduccion {
  activas: { orden: Orden; avance: Pick<TotalesOrden, 'kg_papa_frita' | 'avance_porcentaje'> }[];
  pendientes_sin_formula: number | null;
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

/** La meta en palabras, también para órdenes viejas sin meta_texto. */
export function metaDeOrden(orden: Pick<Orden, 'meta_texto' | 'cantidad_programada'>): string {
  return orden.meta_texto || `${Number(orden.cantidad_programada)} kg`;
}
