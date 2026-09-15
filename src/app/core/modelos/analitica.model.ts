/** Tipos del modulo Analitica. */

export interface FiltrosAnalisis {
  fecha_desde?: string | null;
  fecha_hasta?: string | null;
  turno_id?: number | null;
  horno_id?: number | null;
  producto_id?: number | null;
  categoria_id?: number | null;
  supervisor_id?: number | null;
  sabor_id?: number | null;
}

export interface Desglose {
  etiqueta: string;
  valor: number;
}

export interface Indicadores {
  numero_ordenes: number;
  kg_crudos: number;
  cantidad_bultos: number;
  kg_papa_frita: number;
  kg_sabor: number;
  kg_desperdicio: number;
  kg_aceite: number;
  aceite_por_bulto: number | null;
  rendimiento_porcentaje: number | null;
  porcentaje_absorcion_aceite: number | null;
  por_horno: Desglose[];
  por_producto: Desglose[];
  por_turno: Desglose[];
  por_tipo_desperdicio: Desglose[];
}

export interface IndicadoresCategoria {
  categoria_id: number;
  categoria_nombre: string;
  numero_ordenes: number;
  kg_crudos: number;
  cantidad_bultos: number;
  kg_papa_frita: number;
  kg_sabor: number;
  kg_desperdicio: number;
  kg_aceite: number;
  aceite_por_bulto: number | null;
  rendimiento_porcentaje: number | null;
  porcentaje_absorcion_aceite: number | null;
  sabores_usados: Desglose[];
}

export interface FilaBache {
  registro_id: number;
  numero_orden: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  duracion_horas: number;
  horno: string;
  producto: string;
  categoria: string;
  turno: string;
  supervisor: string;
  operario: string;
  cantidad_bultos: number;
  kg_crudos: number;
  kg_papa_frita_orden: number;
  kg_aceite: number | null;
  temperatura_aceite_c: number | null;
  kg_desperdicio: number;
  aceite_por_bulto: number | null;
  rendimiento_porcentaje: number | null;
  porcentaje_absorcion_aceite: number | null;
}
