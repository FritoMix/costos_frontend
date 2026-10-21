/** Tipos del modulo Bodega de papa. */

export interface ReferenciaPapa {
  id: number;
  nombre: string;
  peso_promedio_bulto_kg: number;
  activo: boolean;
  fecha_creacion: string;
}

export interface ReferenciaPapaGuardar {
  nombre: string;
  peso_promedio_bulto_kg: number;
  activo: boolean;
}
