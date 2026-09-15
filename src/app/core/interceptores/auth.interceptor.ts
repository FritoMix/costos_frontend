import type { HttpInterceptorFn } from '@angular/common/http';

/**
 * Hace que las peticiones a la API lleven las cookies.
 *
 * La sesion vive en una cookie HttpOnly que el JavaScript no puede leer,
 * asi que aqui no ponemos ningun encabezado con el token: solo marcamos
 * `withCredentials` para que el navegador incluya la cookie. En producción
 * (Nginx) y en desarrollo (proxy) el front y la API son el mismo origen,
 * de modo que la cookie viaja sin problemas de CORS.
 */
export const authInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  if (!peticion.url.startsWith('/api/')) {
    return siguiente(peticion);
  }
  return siguiente(peticion.clone({ withCredentials: true }));
};
