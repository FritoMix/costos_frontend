import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { FormulaPapa, FormulaPapaGuardar } from '../modelos/formula-papa.model';

/**
 * Fórmulas de papa reutilizables por producto.
 *
 * Bodega las administra y activa una por producto; el supervisor consulta la
 * activa al crear la orden. Al crear la orden, el backend copia la mezcla a
 * `orden_referencias` con los valores del catálogo de ese momento.
 */
@Injectable({ providedIn: 'root' })
export class FormulasPapaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/bodega/formulas-papa`;

  listar(opciones: { productoId?: number; soloActivas?: boolean } = {}): Observable<FormulaPapa[]> {
    const params: Record<string, string | boolean> = {};
    if (opciones.productoId) {
      params['producto_id'] = String(opciones.productoId);
    }
    if (opciones.soloActivas !== undefined) {
      params['solo_activas'] = opciones.soloActivas;
    }
    return this.http.get<FormulaPapa[]>(this.base, { params });
  }

  obtener(id: number): Observable<FormulaPapa> {
    return this.http.get<FormulaPapa>(`${this.base}/${id}`);
  }

  /** La fórmula activa del producto; `horas` agrega los totales planificados. */
  activa(productoId: number, horas?: number): Observable<FormulaPapa | null> {
    const params: Record<string, string> = { producto_id: String(productoId) };
    if (horas) {
      params['horas'] = String(horas);
    }
    return this.http.get<FormulaPapa | null>(`${this.base}/activa`, { params });
  }

  crear(datos: FormulaPapaGuardar): Observable<FormulaPapa> {
    return this.http.post<FormulaPapa>(this.base, datos);
  }

  actualizar(id: number, datos: FormulaPapaGuardar): Observable<FormulaPapa> {
    return this.http.put<FormulaPapa>(`${this.base}/${id}`, datos);
  }

  activar(id: number): Observable<FormulaPapa> {
    return this.http.post<FormulaPapa>(`${this.base}/${id}/activar`, {});
  }

  desactivar(id: number): Observable<FormulaPapa> {
    return this.http.post<FormulaPapa>(`${this.base}/${id}/desactivar`, {});
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
