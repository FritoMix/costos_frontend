import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  DetalleOrden,
  EstadoOrden,
  Orden,
  OrdenGuardar,
  PaginaOrdenes,
  Recepcion,
  RecepcionGuardar,
  RegistroHorno,
  RegistroHornoGuardar,
} from '../modelos/produccion.model';

/** Acceso a /api/v1/ordenes: ordenes, tandas de horno y recepciones. */
@Injectable({ providedIn: 'root' })
export class OrdenesService {
  private readonly http = inject(HttpClient);
  private readonly pendientes = new Map<string, { clave: string; creada: number }>();

  private crearUnaVez<T>(url: string, datos: unknown): Observable<T> {
    const ahora = Date.now();
    for (const [huella, operacion] of this.pendientes) {
      if (ahora - operacion.creada >= 24 * 60 * 60_000) this.pendientes.delete(huella);
    }
    const huella = `${url}:${JSON.stringify(datos)}`;
    let operacion = this.pendientes.get(huella);
    if (!operacion) {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      operacion = {
        clave: Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''),
        creada: ahora,
      };
      this.pendientes.set(huella, operacion);
    }
    return this.http.post<T>(url, datos, { headers: { 'Idempotency-Key': operacion.clave } }).pipe(
      tap({
        next: () => this.pendientes.delete(huella),
        error: (error) => {
          // Ante red caída/5xx se desconoce si se guardó: el siguiente intento
          // del mismo formulario conserva la clave y recupera el resultado.
          if (error.status >= 400 && error.status < 500) this.pendientes.delete(huella);
        },
      }),
    );
  }

  private readonly base = `${environment.apiUrl}/ordenes`;

  listar(opciones: { estado?: EstadoOrden; soloPropias?: boolean } = {}): Observable<Orden[]> {
    const params: Record<string, string | boolean> = {};
    if (opciones.estado) {
      params['estado'] = opciones.estado;
    }
    if (opciones.soloPropias !== undefined) {
      params['solo_propias'] = opciones.soloPropias;
    }
    return this.http.get<Orden[]>(this.base, { params });
  }

  listarPagina(
    opciones: { pagina?: number; tamano?: number; estado?: EstadoOrden } = {},
  ): Observable<PaginaOrdenes> {
    const params: Record<string, string | number> = {
      pagina: opciones.pagina ?? 1,
      tamano: opciones.tamano ?? 50,
    };
    if (opciones.estado) params['estado'] = opciones.estado;
    return this.http.get<PaginaOrdenes>(`${this.base}/pagina`, { params });
  }

  detalle(id: number): Observable<DetalleOrden> {
    return this.http.get<DetalleOrden>(`${this.base}/${id}`);
  }

  crear(datos: OrdenGuardar): Observable<Orden> {
    return this.crearUnaVez<Orden>(this.base, datos);
  }

  actualizar(id: number, datos: OrdenGuardar): Observable<Orden> {
    return this.http.put<Orden>(`${this.base}/${id}`, datos);
  }

  iniciar(id: number): Observable<Orden> {
    return this.http.post<Orden>(`${this.base}/${id}/iniciar`, {});
  }

  finalizar(id: number): Observable<Orden> {
    return this.http.post<Orden>(`${this.base}/${id}/finalizar`, {});
  }

  cancelar(id: number): Observable<Orden> {
    return this.http.post<Orden>(`${this.base}/${id}/cancelar`, {});
  }

  eliminar(id: number): Observable<{ registros_eliminados: number }> {
    return this.http.delete<{ registros_eliminados: number }>(`${this.base}/${id}`);
  }

  // --- Registros de horno -------------------------------------------------

  crearRegistroHorno(ordenId: number, datos: RegistroHornoGuardar): Observable<RegistroHorno> {
    return this.crearUnaVez<RegistroHorno>(`${this.base}/${ordenId}/registros-horno`, datos);
  }

  actualizarRegistroHorno(
    ordenId: number,
    registroId: number,
    datos: RegistroHornoGuardar,
  ): Observable<RegistroHorno> {
    return this.http.put<RegistroHorno>(
      `${this.base}/${ordenId}/registros-horno/${registroId}`,
      datos,
    );
  }

  eliminarRegistroHorno(ordenId: number, registroId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${ordenId}/registros-horno/${registroId}`);
  }

  // --- Recepciones de saborizado -----------------------------------------

  crearRecepcion(ordenId: number, datos: RecepcionGuardar): Observable<Recepcion> {
    return this.crearUnaVez<Recepcion>(`${this.base}/${ordenId}/recepciones`, datos);
  }

  actualizarRecepcion(
    ordenId: number,
    recepcionId: number,
    datos: RecepcionGuardar,
  ): Observable<Recepcion> {
    return this.http.put<Recepcion>(`${this.base}/${ordenId}/recepciones/${recepcionId}`, datos);
  }

  eliminarRecepcion(ordenId: number, recepcionId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${ordenId}/recepciones/${recepcionId}`);
  }
}
