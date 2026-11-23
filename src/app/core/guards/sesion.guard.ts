import { inject } from '@angular/core';
import type { CanActivateFn} from '@angular/router';
import { Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import type { CodigoRol } from '../modelos/identidad.model';
import { AuthService } from '../servicios/auth.service';
import { NotificacionesService } from '../servicios/notificaciones.service';

/**
 * Deja pasar solo si hay sesion valida.
 *
 * Como el token vive en una cookie HttpOnly que el JavaScript no puede
 * leer, no hay forma de "mirar" si hay sesion sin preguntarle a la API: se
 * llama a /auth/yo (la cookie viaja sola). Si responde bien, hay sesion; si
 * da 401, al login. Una vez comprobado en esta carga de la app, no se
 * vuelve a preguntar.
 */
export const sesionGuard: CanActivateFn = (_ruta, estado) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.usuario()) {
    return true;
  }

  return auth.recuperarSesion().pipe(
    map(() => true),
    catchError(() =>
      of(router.createUrlTree(['/entrar'], { queryParams: { volverA: estado.url } })),
    ),
  );
};

/**
 * Ademas de sesion, exige uno de estos roles. Se usa en las rutas:
 *
 *   { path: 'usuarios', canActivate: [sesionGuard, rolGuard(['admin'])], ... }
 */
export function rolGuard(rolesPermitidos: CodigoRol[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const avisos = inject(NotificacionesService);

    const rol = auth.rol();
    if (rol && rolesPermitidos.includes(rol)) {
      return true;
    }

    avisos.error('No tienes permiso para esa sección.');
    return router.createUrlTree([auth.rutaInicial()]);
  };
}
