import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  FiltrosOrdenesBodega,
  OrdenBodega,
  OrdenBodegaDetalle,
  ProyeccionProduccion,
  ReferenciaPapa,
  ReferenciaPapaGuardar,
} from '../modelos/bodega.model';

/**
 * Catalogo de referencias de papa que administra Bodega.
 *
 * Las referencias activas las consulta tambien el asistente de horno para
 * que el operario elija la materia prima de cada tanda.
 */
@Injectable({ providedIn: 'root' })
export class BodegaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/bodega/referencias-papa`;

  private cacheReferencias$: Observable<ReferenciaPapa[]> | null = null;

  limpiarCache(): void {
    this.cacheReferencias$ = null;
  }

  listar(soloActivas = false, forzarFresca = false): Observable<ReferenciaPapa[]> {
    if (!soloActivas && !forzarFresca && this.cacheReferencias$) {
      return this.cacheReferencias$;
    }

    const peticion = this.http
      .get<ReferenciaPapa[]>(this.base, {
        params: { solo_activas: soloActivas },
      })
      .pipe(shareReplay(1));

    if (!soloActivas) {
      this.cacheReferencias$ = peticion;
    }
    return peticion;
  }

  crear(datos: ReferenciaPapaGuardar): Observable<ReferenciaPapa> {
    return this.http.post<ReferenciaPapa>(this.base, datos).pipe(tap(() => this.limpiarCache()));
  }

  actualizar(id: number, datos: ReferenciaPapaGuardar): Observable<ReferenciaPapa> {
    return this.http
      .put<ReferenciaPapa>(`${this.base}/${id}`, datos)
      .pipe(tap(() => this.limpiarCache()));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(tap(() => this.limpiarCache()));
  }

  /**
   * Simula la distribucion de la capacidad del horno entre las referencias
   * activas. El backend es la fuente definitiva: valida la suma de 100 %,
   * la capacidad y calcula kg crudos/fritos con Decimal.
   */
  proyectar(hornoId: number, horas = 1): Observable<ProyeccionProduccion> {
    return this.http.get<ProyeccionProduccion>(`${environment.apiUrl}/bodega/proyeccion`, {
      params: { horno_id: hornoId, horas },
    });
  }

  // --- Bandeja de órdenes con su fórmula ---------------------------------

  listarOrdenes(filtros: FiltrosOrdenesBodega = {}): Observable<OrdenBodega[]> {
    const params: Record<string, string | boolean> = {};
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        params[clave] = valor as string | boolean;
      }
    }
    return this.http.get<OrdenBodega[]>(`${environment.apiUrl}/bodega/ordenes`, { params });
  }

  obtenerOrden(id: number): Observable<OrdenBodegaDetalle> {
    return this.http.get<OrdenBodegaDetalle>(`${environment.apiUrl}/bodega/ordenes/${id}`);
  }
}
