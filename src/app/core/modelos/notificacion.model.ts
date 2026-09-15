/** Tipos del módulo Notificaciones. */

export type TipoNotificacion = 'orden_creada' | 'produccion_por_terminar';

export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  orden_id: number | null;
  fecha_programada: string;
  leida: boolean;
}

export interface ResumenNotificaciones {
  sin_leer: number;
  pendientes: Notificacion[];
}
