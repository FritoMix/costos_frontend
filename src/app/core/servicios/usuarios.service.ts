import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { Rol, Usuario, UsuarioGuardar } from '../modelos/identidad.model';
import { CACHE } from '../interceptores/cache.interceptor';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/usuarios`;

  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.base, {
      context: new HttpContext().set(CACHE, true),
    });
  }

  roles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${this.base}/roles`, {
      context: new HttpContext().set(CACHE, 60_000), // 1 min: los roles no cambian
    });
  }

  detalle(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.base}/${id}`);
  }

  crear(datos: UsuarioGuardar): Observable<Usuario> {
    return this.http.post<Usuario>(this.base, datos);
  }

  actualizar(id: number, datos: UsuarioGuardar): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.base}/${id}`, datos);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /** Para que el supervisor busque a quién darle contraseña temporal. */
  paraRecuperar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.base}/para-recuperar`);
  }

  /** Contraseña temporal de 8 números: se muestra una sola vez para dictarla. */
  passwordTemporal(id: number): Observable<{ password_temporal: string }> {
    return this.http.post<{ password_temporal: string }>(
      `${this.base}/${id}/password-temporal`,
      {},
    );
  }
}
