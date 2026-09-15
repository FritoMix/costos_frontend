/**
 * Tipos del modulo Identidad. Son el espejo exacto de lo que devuelve la
 * API (backend/app/modules/identidad/schemas.py): si algo cambia alla,
 * TypeScript avisa aqui.
 */

export type CodigoRol = 'admin' | 'supervisor' | 'operario_horno' | 'operario_saborizado';

export interface Rol {
  id: number;
  codigo: CodigoRol;
  nombre: string;
}

export interface Usuario {
  id: number;
  nombre_completo: string;
  nombre_usuario: string;
  activo: boolean;
  fecha_creacion: string;
  rol: Rol;
}

export interface Credenciales {
  nombre_usuario: string;
  password: string;
}

export interface RespuestaLogin {
  // El token NO viene aquí: viaja en una cookie HttpOnly que el navegador
  // maneja solo. Solo recibimos quién entró y cuánto dura la sesión.
  expira_en_segundos: number;
  usuario: Usuario;
}

export interface UsuarioGuardar {
  nombre_completo: string;
  nombre_usuario: string;
  rol_id: number;
  activo: boolean;
  password?: string | null;
}

/** Texto que ve el usuario para cada rol (el codigo nunca se muestra). */
export const ETIQUETAS_ROL: Record<CodigoRol, string> = {
  admin: 'Administrador / Analista',
  supervisor: 'Supervisor',
  operario_horno: 'Operario de Horno',
  operario_saborizado: 'Operario de Saborizado',
};
