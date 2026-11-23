import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  Formula,
  FormulaGuardar,
  FormulaNoche,
  FormulaProyeccion,
  FormulaProyeccionGuardar,
} from '../modelos/formula.model';

/**
 * Fórmula de producción de una orden.
 *
 * Bodega la define y la corrige mientras la orden esté Pendiente y sin
 * tandas; al iniciar la producción queda congelada. La proyección es solo
 * una vista previa: el backend es la fuente definitiva de los cálculos.
 */
@Injectable({ providedIn: 'root' })
export class FormulaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ordenes`;

  obtener(ordenId: number): Observable<Formula> {
    return this.http.get<Formula>(`${this.base}/${ordenId}/formula`);
  }

  guardar(ordenId: number, datos: FormulaGuardar): Observable<Formula> {
    return this.http.put<Formula>(`${this.base}/${ordenId}/formula`, datos);
  }

  proyectar(ordenId: number, datos: FormulaProyeccionGuardar): Observable<FormulaProyeccion> {
    return this.http.post<FormulaProyeccion>(`${this.base}/${ordenId}/formula/proyeccion`, datos);
  }

  // --- Fórmula de la noche por horno ---

  listarNoche(): Observable<FormulaNoche[]> {
    return this.http.get<FormulaNoche[]>(`${environment.apiUrl}/bodega/formula-noche`);
  }

  guardarNoche(
    hornoId: number,
    referencias: { referencia_papa_id: number; bultos_por_tanda: number }[],
  ): Observable<FormulaNoche> {
    return this.http.put<FormulaNoche>(`${environment.apiUrl}/bodega/formula-noche/${hornoId}`, {
      referencias,
    });
  }

  confirmarNoche(ordenId: number): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/bodega/ordenes/${ordenId}/confirmar-formula`, {});
  }
}
