import type { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../servicios/auth.service';
import { NotificacionesService } from '../servicios/notificaciones.service';

/**
 * Convierte cualquier error de la API en un aviso legible.
 *
 * La API siempre responde { "detail": "mensaje para la persona" }, asi que
 * aqui no hay que adivinar nada. Ademas:
 *   401 -> la sesion se vencio: se cierra y se vuelve al login.
 *   0   -> no hubo respuesta: el servidor esta caido o no hay red.
 */
export const erroresInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  const avisos = inject(NotificacionesService);
  const auth = inject(AuthService);

  return siguiente(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      const mensaje = extraerMensaje(error);

      if (error.status === 401) {
        // Al abrir la app comprobamos la sesión contra /auth/yo: si la
        // cookie ya no sirve, no hace falta molestar al usuario con un
        // aviso rojo. Limpiamos el estado local (la cookie ya está
        // inválida; no vale la pena pedir el logout).
        if (!peticion.url.endsWith('/auth/yo')) {
          avisos.error(mensaje);
        }
        auth.limpiarLocal();
      } else if (error.status !== 422) {
        // El 422 lo muestra el propio formulario, campo por campo.
        avisos.error(mensaje);
      }

      return throwError(() => error);
    }),
  );
};

function extraerMensaje(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'No se pudo contactar al servidor. Revisa la conexión e intenta de nuevo.';
  }
  const detalle = (error.error as { detail?: string } | null)?.detail;
  if (typeof detalle === 'string' && detalle.trim()) {
    return detalle;
  }
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}
