/** Tipos del modulo Catalogos. */

export interface ItemCatalogo {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface CatalogoGuardar {
  nombre: string;
  activo: boolean;
  /** Solo categorías: sabores permitidos. Sin enviarlo, se conservan. */
  sabor_ids?: number[];
}

/** Categoría con sus sabores permitidos (vacío: acepta todos los activos). */
export interface CategoriaCatalogo extends ItemCatalogo {
  sabor_ids?: number[];
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

/** Aceite de fritura con densidad fija (V18). */
export interface TipoAceite {
  id: number;
  nombre: string;
  densidad_kg_por_litro: number;
  proveedor: string | null;
  activo: boolean;
}

export interface TipoAceiteGuardar {
  nombre: string;
  densidad_kg_por_litro: number;
  proveedor: string | null;
  activo: boolean;
}

/** Línea de producción (V21): papa, plátano, pellet, extruido, trocillo, nachos. */
export interface Linea {
  id: number;
  codigo: string;
  nombre: string;
  unidad_materia_prima: 'bultos' | 'kg';
  nombre_materia_prima: string;
  usa_bodega: boolean;
  pide_variedad: boolean;
  permite_canastillas: boolean;
  unidades_orden: ('kg' | 'canastillas' | 'mojes' | 'baches' | 'bultos')[];
  activo: boolean;
}

/** Variedad de la materia prima de una línea (Hartón, FHIA 21). */
export interface Variedad {
  id: number;
  linea_id: number;
  nombre: string;
  activo: boolean;
}

export interface VariedadGuardar {
  linea_id: number;
  nombre: string;
  activo: boolean;
}

export interface Horno {
  id: number;
  nombre: string;
  activo: boolean;
  tipo_aceite: string | null;
  /** Aceite del catálogo; su densidad solo se usa si el horno no tiene muestras. */
  aceite?: TipoAceite | null;
  apto_exportacion: boolean;
  tanque_diametro_cm: number | null;
  litros_por_cm_manual: number | null;
  /** Calculado por la API: lo que realmente se usa para pasar de cm a litros. */
  litros_por_cm: number | null;
  /** Papa (línea con Bodega): bultos de papa cruda por hora. */
  capacidad_bultos_hora: number | null;
  /** Demás líneas (plátano, pellet, maíz…): kilos por hora. Ausente en APIs viejas. */
  capacidad_kg_hora?: number | null;
  /** «continuo» o «batch» (V31). Ausente en APIs viejas = continuo. */
  tipo?: 'continuo' | 'batch';
  categorias: ItemCatalogo[];
  /** Línea del horno; de aquí sale la línea de la orden. */
  linea?: Linea | null;
}

export interface HornoGuardar {
  nombre: string;
  activo: boolean;
  tipo_aceite: string | null;
  aceite_id?: number | null;
  apto_exportacion: boolean;
  tanque_diametro_cm: number | null;
  litros_por_cm_manual: number | null;
  capacidad_bultos_hora: number | null;
  capacidad_kg_hora?: number | null;
  tipo?: 'continuo' | 'batch';
  categoria_ids: number[];
  linea_id?: number | null;
}

export interface HornoCapacidadGuardar {
  capacidad_bultos_hora: number;
}

export interface Producto {
  id: number;
  nombre_comercial: string;
  activo: boolean;
  peso_estandar_canastilla_kg: number | null;
  /** Mercado del producto: la orden solo ofrece los de su destino o los de "ambos". */
  destino?: DestinoProducto;
  /** Rango de % de sabor esperado: si se sale, saborizado avisa. */
  sabor_minimo_pct?: number | null;
  sabor_maximo_pct?: number | null;
  categoria: ItemCatalogo;
}

export type DestinoProducto = 'nacional' | 'exportacion' | 'ambos';

/** ¿Sirve este producto para una orden de ese destino? */
export function productoSirvePara(producto: Producto, destinoOrden: string): boolean {
  const destino = producto.destino ?? 'ambos';
  return destino === 'ambos' || destino === destinoOrden;
}

export interface ProductoGuardar {
  nombre_comercial: string;
  categoria_id: number;
  activo: boolean;
  peso_estandar_canastilla_kg: number | null;
  destino: DestinoProducto;
  sabor_minimo_pct?: number | null;
  sabor_maximo_pct?: number | null;
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
