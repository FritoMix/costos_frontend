/** Tipos del modulo Bodega de papa. */

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

export interface ReferenciaPapaGuardar {
  nombre: string;
  tipo: string;
  peso_promedio_bulto_kg: number;
  rendimiento_fritura_pct: number;
  porcentaje_produccion_pct: number;
  activo: boolean;
}

/** Fila planificada de una proyeccion; no es produccion real. */
export interface ProyeccionReferencia {
  referencia_id: number;
  nombre: string;
  tipo: string;
  porcentaje_produccion_pct: number;
  bultos: number;
  peso_promedio_bulto_kg: number;
  rendimiento_fritura_pct: number;
  kg_crudos: number;
  kg_fritos_estimados: number;
}

export interface ProyeccionProduccion {
  horno_id: number;
  horno_nombre: string;
  capacidad_bultos_hora: number;
  horas: number;
  total_bultos: number;
  total_kg_crudos: number;
  total_kg_fritos_estimados: number;
  referencias: ProyeccionReferencia[];
}
