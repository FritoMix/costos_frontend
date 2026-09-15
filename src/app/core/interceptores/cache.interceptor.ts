import type { HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { HttpContextToken } from '@angular/common/http';
import { of, tap } from 'rxjs';

interface EntradaCache {
  respuesta: HttpEvent<unknown>;
  expira: number;
}

const cache = new Map<string, EntradaCache>();
const TTL_POR_DEFECTO_MS = 30_000; // 30 segundos

/**
 * Token de contexto para activar el caché en una petición GET.
 *
 * Uso:
 *   import { HttpContext } from '@angular/common/http';
 *   import { CACHE } from '../interceptores/cache.interceptor';
 *
 *   this.http.get('/api/v1/catalogos', {
 *     context: new HttpContext().set(CACHE, true),       // TTL por defecto (30s)
 *     context: new HttpContext().set(CACHE, 10000),      // TTL de 10 segundos
 *   })
 */
export const CACHE = new HttpContextToken<boolean | number>(() => false);

/**
 * Interceptor de caché para peticiones GET que no cambian con frecuencia.
 *
 * Las respuestas se almacenan en memoria con un TTL configurable.
 * Cualquier POST/PUT/PATCH/DELETE invalida toda la caché automaticamente.
 */
export const cacheInterceptor: HttpInterceptorFn = (request, next) => {
  // Solo cacheamos peticiones GET
  if (request.method !== 'GET') {
    // Al mutar datos, invalidamos la caché para que la siguiente
    // lectura obtenga datos frescos del servidor.
    cache.clear();
    return next(request);
  }

  const ttl = request.context.get(CACHE);
  if (!ttl) {
    return next(request);
  }

  const ttlMs = typeof ttl === 'number' ? ttl : TTL_POR_DEFECTO_MS;
  const clave = request.urlWithParams;
  const entrada = cache.get(clave);

  if (entrada && entrada.expira > Date.now()) {
    return of(entrada.respuesta);
  }

  return next(request).pipe(
    tap((respuesta) => {
      cache.set(clave, { respuesta, expira: Date.now() + ttlMs });
    }),
  );
};

/** Invalida toda la caché (útil tras logout o refresh manual). */
export function limpiarCache(): void {
  cache.clear();
}
