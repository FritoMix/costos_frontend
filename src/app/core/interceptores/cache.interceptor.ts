import type { HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { HttpContextToken, HttpResponse } from '@angular/common/http';
import { of, tap } from 'rxjs';

interface EntradaCache {
  respuesta: HttpEvent<unknown>;
  expira: number;
}

const cache = new Map<string, EntradaCache>();
const MAX_ENTRADAS = 100;
let generacion = 0;
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
    limpiarCache();
    return next(request).pipe(
      tap((evento) => {
        if (evento instanceof HttpResponse) limpiarCache();
      }),
    );
  }

  const ttl = request.context.get(CACHE);
  if (!ttl) {
    return next(request);
  }

  const ttlMs = typeof ttl === 'number' ? ttl : TTL_POR_DEFECTO_MS;
  const clave = request.urlWithParams;
  const entrada = cache.get(clave);

  const generacionInicial = generacion;
  if (entrada && entrada.expira > Date.now()) {
    return of(entrada.respuesta);
  }

  return next(request).pipe(
    tap((respuesta) => {
      if (!(respuesta instanceof HttpResponse) || generacionInicial !== generacion) return;
      cache.delete(clave);
      cache.set(clave, { respuesta, expira: Date.now() + ttlMs });
      if (cache.size > MAX_ENTRADAS) cache.delete(cache.keys().next().value!);
    }),
  );
};

/** Invalida toda la caché (útil tras logout o refresh manual). */
export function limpiarCache(): void {
  generacion++;
  cache.clear();
}
