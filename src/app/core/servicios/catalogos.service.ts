import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable} from 'rxjs';
import { shareReplay, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  CatalogoGuardar,
  ConfiguracionPlanta,
  DensidadVigente,
  Horno,
  HornoGuardar,
  ItemCatalogo,
  MuestraDensidad,
  Producto,
  ProductoGuardar,
  Turno,
  TurnoGuardar,
} from '../modelos/catalogos.model';

/** Acceso a /api/v1/catalogos con caché en memoria e invalidación automática. */
@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/catalogos`;

  // --- Caché en memoria para evitar peticiones repetitivas ---
  private cacheCategorias$: Observable<ItemCatalogo[]> | null = null;
  private cacheSabores$: Observable<ItemCatalogo[]> | null = null;
  private cacheTiposDesperdicio$: Observable<ItemCatalogo[]> | null = null;
  private cacheTurnos$: Observable<Turno[]> | null = null;
  private cacheHornos$: Observable<Horno[]> | null = null;
  private cacheProductos$: Observable<Producto[]> | null = null;
  private cacheConfiguracion$: Observable<ConfiguracionPlanta> | null = null;

  limpiarCache(): void {
    this.cacheCategorias$ = null;
    this.cacheSabores$ = null;
    this.cacheTiposDesperdicio$ = null;
    this.cacheTurnos$ = null;
    this.cacheHornos$ = null;
    this.cacheProductos$ = null;
    this.cacheConfiguracion$ = null;
  }

  // --- Categorias ---

  listarCategorias(soloActivas = false, forzarFresca = false): Observable<ItemCatalogo[]> {
    if (!soloActivas && !forzarFresca && this.cacheCategorias$) {
      return this.cacheCategorias$;
    }
    const peticion = this.http
      .get<ItemCatalogo[]>(`${this.base}/categorias`, {
        params: { solo_activas: soloActivas },
      })
      .pipe(shareReplay(1));

    if (!soloActivas) {
      this.cacheCategorias$ = peticion;
    }
    return peticion;
  }

  crearCategoria(datos: CatalogoGuardar): Observable<ItemCatalogo> {
    return this.http
      .post<ItemCatalogo>(`${this.base}/categorias`, datos)
      .pipe(tap(() => (this.cacheCategorias$ = null)));
  }

  actualizarCategoria(id: number, datos: CatalogoGuardar): Observable<ItemCatalogo> {
    return this.http
      .put<ItemCatalogo>(`${this.base}/categorias/${id}`, datos)
      .pipe(tap(() => (this.cacheCategorias$ = null)));
  }

  eliminarCategoria(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/categorias/${id}`)
      .pipe(tap(() => (this.cacheCategorias$ = null)));
  }

  // --- Sabores ---

  listarSabores(soloActivos = false, forzarFresca = false): Observable<ItemCatalogo[]> {
    if (!soloActivos && !forzarFresca && this.cacheSabores$) {
      return this.cacheSabores$;
    }
    const peticion = this.http
      .get<ItemCatalogo[]>(`${this.base}/sabores`, {
        params: { solo_activos: soloActivos },
      })
      .pipe(shareReplay(1));

    if (!soloActivos) {
      this.cacheSabores$ = peticion;
    }
    return peticion;
  }

  crearSabor(datos: CatalogoGuardar): Observable<ItemCatalogo> {
    return this.http
      .post<ItemCatalogo>(`${this.base}/sabores`, datos)
      .pipe(tap(() => (this.cacheSabores$ = null)));
  }

  actualizarSabor(id: number, datos: CatalogoGuardar): Observable<ItemCatalogo> {
    return this.http
      .put<ItemCatalogo>(`${this.base}/sabores/${id}`, datos)
      .pipe(tap(() => (this.cacheSabores$ = null)));
  }

  eliminarSabor(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/sabores/${id}`)
      .pipe(tap(() => (this.cacheSabores$ = null)));
  }

  // --- Tipos de desperdicio ---

  listarTiposDesperdicio(soloActivos = false, forzarFresca = false): Observable<ItemCatalogo[]> {
    if (!soloActivos && !forzarFresca && this.cacheTiposDesperdicio$) {
      return this.cacheTiposDesperdicio$;
    }
    const peticion = this.http
      .get<ItemCatalogo[]>(`${this.base}/tipos-desperdicio`, {
        params: { solo_activos: soloActivos },
      })
      .pipe(shareReplay(1));

    if (!soloActivos) {
      this.cacheTiposDesperdicio$ = peticion;
    }
    return peticion;
  }

  crearTipoDesperdicio(datos: CatalogoGuardar): Observable<ItemCatalogo> {
    return this.http
      .post<ItemCatalogo>(`${this.base}/tipos-desperdicio`, datos)
      .pipe(tap(() => (this.cacheTiposDesperdicio$ = null)));
  }

  actualizarTipoDesperdicio(id: number, datos: CatalogoGuardar): Observable<ItemCatalogo> {
    return this.http
      .put<ItemCatalogo>(`${this.base}/tipos-desperdicio/${id}`, datos)
      .pipe(tap(() => (this.cacheTiposDesperdicio$ = null)));
  }

  eliminarTipoDesperdicio(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/tipos-desperdicio/${id}`)
      .pipe(tap(() => (this.cacheTiposDesperdicio$ = null)));
  }

  // --- Turnos ---

  listarTurnos(soloActivos = false, forzarFresca = false): Observable<Turno[]> {
    if (!soloActivos && !forzarFresca && this.cacheTurnos$) {
      return this.cacheTurnos$;
    }
    const peticion = this.http
      .get<Turno[]>(`${this.base}/turnos`, {
        params: { solo_activos: soloActivos },
      })
      .pipe(shareReplay(1));

    if (!soloActivos) {
      this.cacheTurnos$ = peticion;
    }
    return peticion;
  }

  crearTurno(datos: TurnoGuardar): Observable<Turno> {
    return this.http
      .post<Turno>(`${this.base}/turnos`, datos)
      .pipe(tap(() => (this.cacheTurnos$ = null)));
  }

  actualizarTurno(id: number, datos: TurnoGuardar): Observable<Turno> {
    return this.http
      .put<Turno>(`${this.base}/turnos/${id}`, datos)
      .pipe(tap(() => (this.cacheTurnos$ = null)));
  }

  eliminarTurno(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/turnos/${id}`)
      .pipe(tap(() => (this.cacheTurnos$ = null)));
  }

  // --- Hornos ---

  listarHornos(soloActivos = false, forzarFresca = false): Observable<Horno[]> {
    if (!soloActivos && !forzarFresca && this.cacheHornos$) {
      return this.cacheHornos$;
    }
    const peticion = this.http
      .get<Horno[]>(`${this.base}/hornos`, {
        params: { solo_activos: soloActivos },
      })
      .pipe(shareReplay(1));

    if (!soloActivos) {
      this.cacheHornos$ = peticion;
    }
    return peticion;
  }

  crearHorno(datos: HornoGuardar): Observable<Horno> {
    return this.http
      .post<Horno>(`${this.base}/hornos`, datos)
      .pipe(tap(() => (this.cacheHornos$ = null)));
  }

  actualizarHorno(id: number, datos: HornoGuardar): Observable<Horno> {
    return this.http
      .put<Horno>(`${this.base}/hornos/${id}`, datos)
      .pipe(tap(() => (this.cacheHornos$ = null)));
  }

  eliminarHorno(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/hornos/${id}`)
      .pipe(tap(() => (this.cacheHornos$ = null)));
  }

  // --- Productos ---

  listarProductos(soloActivos = false, forzarFresca = false): Observable<Producto[]> {
    if (!soloActivos && !forzarFresca && this.cacheProductos$) {
      return this.cacheProductos$;
    }
    const peticion = this.http
      .get<Producto[]>(`${this.base}/productos`, {
        params: { solo_activos: soloActivos },
      })
      .pipe(shareReplay(1));

    if (!soloActivos) {
      this.cacheProductos$ = peticion;
    }
    return peticion;
  }

  crearProducto(datos: ProductoGuardar): Observable<Producto> {
    return this.http
      .post<Producto>(`${this.base}/productos`, datos)
      .pipe(tap(() => (this.cacheProductos$ = null)));
  }

  actualizarProducto(id: number, datos: ProductoGuardar): Observable<Producto> {
    return this.http
      .put<Producto>(`${this.base}/productos/${id}`, datos)
      .pipe(tap(() => (this.cacheProductos$ = null)));
  }

  eliminarProducto(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/productos/${id}`)
      .pipe(tap(() => (this.cacheProductos$ = null)));
  }

  // --- Configuracion de planta ---

  verConfiguracion(forzarFresca = false): Observable<ConfiguracionPlanta> {
    if (!forzarFresca && this.cacheConfiguracion$) {
      return this.cacheConfiguracion$;
    }
    const peticion = this.http
      .get<ConfiguracionPlanta>(`${this.base}/configuracion`)
      .pipe(shareReplay(1));

    this.cacheConfiguracion$ = peticion;
    return peticion;
  }

  guardarConfiguracion(datos: ConfiguracionPlanta): Observable<ConfiguracionPlanta> {
    return this.http
      .put<ConfiguracionPlanta>(`${this.base}/configuracion`, datos)
      .pipe(tap(() => (this.cacheConfiguracion$ = null)));
  }

  // --- Densidad del aceite ---

  densidadesVigentes(): Observable<DensidadVigente[]> {
    return this.http.get<DensidadVigente[]>(`${this.base}/densidad-aceite/vigentes`);
  }

  listarMuestrasDensidad(hornoId?: number): Observable<MuestraDensidad[]> {
    return this.http.get<MuestraDensidad[]>(`${this.base}/densidad-aceite`, {
      params: hornoId ? { horno_id: hornoId } : {},
    });
  }

  registrarMuestraDensidad(datos: {
    horno_id: number;
    fecha: string;
    densidad_kg_por_litro: number;
  }): Observable<MuestraDensidad> {
    return this.http.post<MuestraDensidad>(`${this.base}/densidad-aceite`, datos);
  }
}

