/** Tipos de la fórmula de producción por orden. */

import type { UsuarioRef } from './produccion.model';

export type EstadoFormula =
  | 'sin_formula'
  | 'lista'
  | 'en_produccion'
  | 'finalizada'
  | 'cancelada'
  | 'no_aplica';

export interface FormulaReferencia {
  referencia_id: number;
  nombre: string;
  tipo: string | null;
  bultos_por_tanda: number;
  bultos_planificados: number;
  porcentaje_produccion_pct: number;
  peso_promedio_bulto_kg: number;
  rendimiento_fritura_pct: number;
  kg_crudos_por_tanda: number;
  kg_fritos_por_tanda: number;
  kg_crudos_planificados: number;
  kg_fritos_estimados: number;
  bultos_producidos: number;
  bultos_restantes: number;
}

export interface Formula {
  orden_id: number;
  estado: EstadoFormula;
  referencias: FormulaReferencia[];
  notas: string | null;
  capacidad_bultos_hora: number | null;
  capacidad_maxima_bultos: number | null;
  total_bultos_por_tanda: number;
  total_bultos_planificados: number;
  total_kg_crudos: number;
  total_kg_fritos_estimados: number;
  total_bultos_producidos: number;
  avance_bultos_porcentaje: number | null;
  tandas_registradas: number;
  tandas_programadas: number | null;
  actualizada_por: UsuarioRef | null;
  fecha_actualizacion: string | null;
  advertencias: string[];
}

export interface FormulaGuardar {
  referencias: { referencia_papa_id: number; bultos_por_tanda: number }[];
  notas: string | null;
}

export interface FormulaProyeccionGuardar {
  referencias: { referencia_papa_id: number; bultos_por_tanda: number }[];
  usar_sugerencia: boolean;
}

export interface FormulaProyeccionReferencia {
  referencia_id: number;
  nombre: string;
  tipo: string | null;
  bultos_por_tanda: number;
  porcentaje_produccion_pct: number;
  peso_promedio_bulto_kg: number;
  rendimiento_fritura_pct: number;
  kg_crudos_por_tanda: number;
  kg_fritos_por_tanda: number;
  kg_crudos_planificados: number;
  kg_fritos_estimados: number;
}

export interface FormulaProyeccion {
  origen: 'sugerencia' | 'manual';
  capacidad_bultos_hora: number | null;
  capacidad_maxima_bultos: number | null;
  total_bultos_por_tanda: number;
  total_bultos_planificados: number;
  kg_fritos_por_bulto_promedio: number;
  total_kg_crudos: number;
  total_kg_fritos_estimados: number;
  cantidad_programada: number;
  diferencia_kg: number;
  diferencia_pct: number;
  tandas_programadas: number;
  factible: boolean;
  mensaje: string | null;
  referencias: FormulaProyeccionReferencia[];
}
