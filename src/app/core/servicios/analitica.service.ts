import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CACHE } from '../interceptores/cache.interceptor';
import type {
  FilaBache,
  FiltrosAnalisis,
  Indicadores,
  IndicadoresCategoria,
} from '../modelos/analitica.model';
import type { Usuario } from '../modelos/identidad.model';

@Injectable({ providedIn: 'root' })
export class AnaliticaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/analitica`;

  indicadores(filtros: FiltrosAnalisis): Observable<Indicadores> {
    return this.http.get<Indicadores>(`${this.base}/indicadores`, {
      params: this.aParams(filtros),
    });
  }

  porCategoria(filtros: FiltrosAnalisis): Observable<IndicadoresCategoria[]> {
    return this.http.get<IndicadoresCategoria[]>(`${this.base}/por-categoria`, {
      params: this.aParams(filtros),
    });
  }

  baches(filtros: FiltrosAnalisis): Observable<FilaBache[]> {
    return this.http.get<FilaBache[]>(`${this.base}/baches`, { params: this.aParams(filtros) });
  }

  /** Supervisores disponibles para el filtro (viven en el modulo Identidad). */
  supervisores(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${environment.apiUrl}/usuarios/supervisores`, {
      context: new HttpContext().set(CACHE, 60_000), // 1 min: supervisores cambian poco
    });
  }

  /**
   * Descarga el archivo exportado. Se pide como "blob" porque la peticion
   * lleva el token en la cabecera: un enlace normal no podria autenticarse.
   */
  exportar(filtros: FiltrosAnalisis, formato: 'csv' | 'xlsx'): Observable<Blob> {
    return this.http.get(`${this.base}/exportar.${formato}`, {
      params: this.aParams(filtros),
      responseType: 'blob',
    });
  }

  /** Los filtros vacios no se envian: asi la URL queda limpia y legible. */
  private aParams(filtros: FiltrosAnalisis): HttpParams {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== null && valor !== undefined && valor !== '') {
        params = params.set(clave, String(valor));
      }
    }
    return params;
  }
}
