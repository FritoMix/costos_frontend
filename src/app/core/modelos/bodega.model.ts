/** Tipos del modulo Bodega de papa. */

import type { Formula } from './formula.model';
import type { Orden } from './produccion.model';

export interface ReferenciaPapa {
  id: number;
  nombre: string;
  tipo: string | null;
  peso_promedio_bulto_kg: number;
  rendimiento_fritura_pct: number | null;
  porcentaje_produccion_pct: number | null;
  activo: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

/**
 * Datos que captura Bodega hoy. `tipo`, rendimiento y participación ya no se
 * piden en la pantalla: viajan opcionales por compatibilidad y quedan en NULL
 * en las referencias nuevas.
 */
export interface ReferenciaPapaGuardar {
  nombre: string;
  peso_promedio_bulto_kg: number;
  activo: boolean;
  tipo?: string | null;
  rendimiento_fritura_pct?: number | null;
  porcentaje_produccion_pct?: number | null;
}

/** Fila planificada de una proyeccion; no es produccion real. */
export interface ProyeccionReferencia {
  referencia_id: number;
  nombre: string;
  tipo: string | null;
  porcentaje_produccion_pct: number;
  bultos: number;
  peso_promedio_bulto_kg: number;
  rendimiento_fritura_pct: number | null;
  kg_crudos: number;
  kg_fritos_estimados: number | null;
}

export interface ProyeccionProduccion {
  horno_id: number;
  horno_nombre: string;
  capacidad_bultos_hora: number;
  horas: number;
  total_bultos: number;
  total_kg_crudos: number;
  total_kg_fritos_estimados: number | null;
  referencias: ProyeccionReferencia[];
}

/** Fila de la bandeja de órdenes de Bodega, con el avance de su fórmula. */
export interface OrdenBodega extends Orden {
  formula_notas: string | null;
  total_bultos_planificados: number | null;
  total_bultos_producidos: number | null;
  tandas_registradas: number;
  tandas_programadas: number | null;
  avance_bultos_porcentaje: number | null;
}

export interface OrdenBodegaDetalle {
  orden: OrdenBodega;
  formula: Formula;
}

/** Filtros de la bandeja de órdenes de Bodega. */
export interface FiltrosOrdenesBodega {
  fecha_desde?: string;
  fecha_hasta?: string;
  estado?: string;
  producto_id?: number;
  destino?: string;
  solo_sin_formula?: boolean;
}
