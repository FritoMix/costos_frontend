/** Tipos de las fórmulas de papa reutilizables por producto. */

import type { ProductoRef, UsuarioRef } from './produccion.model';

export interface FormulaPapaReferencia {
  referencia_id: number;
  nombre: string;
  tipo: string | null;
  bultos_por_tanda: number;
  porcentaje_produccion_pct: number;
  peso_promedio_bulto_kg: number;
  rendimiento_fritura_pct: number;
  kg_crudos_por_tanda: number;
  kg_fritos_por_tanda: number;
}

export interface FormulaPapa {
  id: number;
  nombre: string;
  producto: ProductoRef;
  activa: boolean;
  notas: string | null;
  referencias: FormulaPapaReferencia[];
  total_bultos_por_tanda: number;
  total_kg_crudos: number;
  total_kg_fritos_estimados: number;
  horas: number | null;
  total_bultos_planificados: number | null;
  total_kg_crudos_planificados: number | null;
  total_kg_fritos_planificados: number | null;
  creado_por: UsuarioRef | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface FormulaPapaGuardar {
  nombre: string;
  producto_id: number;
  referencias: { referencia_papa_id: number; bultos_por_tanda: number }[];
  notas: string | null;
}
