import type { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
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
  const enrutador = inject(Router);

  return siguiente(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      const mensaje = extraerMensaje(error);

      if (error.status === 401) {
        // Al abrir la app comprobamos la sesión contra /auth/yo: si la
        // cookie ya no sirve, no hace falta molestar al usuario con un
        // aviso rojo. En ese caso NO navegamos aquí: el guard de sesión ya
        // redirige al login con `volverA` y una navegación extra la pisaría.
        if (peticion.url.endsWith('/auth/yo')) {
          auth.limpiarLocal(false);
        } else {
          // La sesión se venció a mitad de una acción: se avisa y se vuelve
          // al login recordando dónde estaba para retomarlo al entrar.
          avisos.error(mensaje);
          const destino = enrutador.url;
          auth.limpiarLocal(false);
          void enrutador.navigate(['/entrar'], {
            queryParams: destino === '/entrar' ? {} : { volverA: destino },
          });
        }
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
