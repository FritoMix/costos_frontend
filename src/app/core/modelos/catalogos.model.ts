/** Tipos del modulo Catalogos. */

export interface ItemCatalogo {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface CatalogoGuardar {
  nombre: string;
  activo: boolean;
}

export interface Turno {
  id: number;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  cruza_medianoche: boolean;
  activo: boolean;
}

export interface TurnoGuardar {
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

export interface Horno {
  id: number;
  nombre: string;
  activo: boolean;
  tipo_aceite: string | null;
  apto_exportacion: boolean;
  tanque_diametro_cm: number | null;
  litros_por_cm_manual: number | null;
  /** Calculado por la API: lo que realmente se usa para pasar de cm a litros. */
  litros_por_cm: number | null;
  categorias: ItemCatalogo[];
}

export interface HornoGuardar {
  nombre: string;
  activo: boolean;
  tipo_aceite: string | null;
  apto_exportacion: boolean;
  tanque_diametro_cm: number | null;
  litros_por_cm_manual: number | null;
  categoria_ids: number[];
}

export interface Producto {
  id: number;
  nombre_comercial: string;
  activo: boolean;
  peso_estandar_canastilla_kg: number | null;
  categoria: ItemCatalogo;
}

export interface ProductoGuardar {
  nombre_comercial: string;
  categoria_id: number;
  activo: boolean;
  peso_estandar_canastilla_kg: number | null;
}

export interface ConfiguracionPlanta {
  peso_estandar_bulto_kg: number | null;
  peso_estandar_canastilla_kg: number | null;
}

export interface MuestraDensidad {
  id: number;
  horno_id: number;
  fecha: string;
  densidad_kg_por_litro: number;
}

export interface DensidadVigente {
  horno_id: number;
  horno_nombre: string;
  fecha: string | null;
  densidad_kg_por_litro: number | null;
}
