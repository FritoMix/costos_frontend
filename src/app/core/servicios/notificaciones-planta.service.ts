import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type { Observable, Subscription} from 'rxjs';
import { switchMap, timer } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { Notificacion, ResumenNotificaciones } from '../modelos/notificacion.model';
import { AlarmaService } from './alarma.service';
import { AuthService } from './auth.service';

/**
 * Avisos de planta: consulta periódicamente si hay algo nuevo y, cuando lo
 * hay, lo muestra y hace sonar la alarma.
 *
 * Se usa sondeo (preguntar cada pocos segundos) en vez de WebSockets a
 * propósito: es lo más resistente en la red de la fábrica —si se cae la
 * conexión, el siguiente intento simplemente vuelve a traer lo pendiente—
 * y no necesita configuración especial en el servidor.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesPlantaService {
  private readonly http = inject(HttpClient);
  private readonly alarma = inject(AlarmaService);
  private readonly auth = inject(AuthService);

  /** Cada cuánto se pregunta al servidor. */
  private readonly INTERVALO_MS = 20_000;

  private suscripcion: Subscription | null = null;
  /** Ids ya anunciados: evita que la alarma vuelva a sonar por lo mismo. */
  private readonly yaAnunciadas = new Set<number>();

  private readonly _pendientes = signal<Notificacion[]>([]);
  readonly pendientes = this._pendientes.asReadonly();
  readonly sinLeer = computed(() => this._pendientes().length);

  /** Empieza a vigilar. Se llama una vez, cuando ya hay sesión. */
  iniciar(): void {
    if (this.suscripcion) {
      return;
    }
    this.suscripcion = timer(0, this.INTERVALO_MS)
      .pipe(switchMap(() => this.consultar()))
      .subscribe({
        next: (resumen) => this.procesar(resumen),
        // Un fallo puntual de red no debe matar el sondeo: se reinicia.
        error: () => this.reiniciar(),
      });
  }

  detener(): void {
    this.suscripcion?.unsubscribe();
    this.suscripcion = null;
    this.yaAnunciadas.clear();
    this._pendientes.set([]);
  }

  marcarLeida(id: number): void {
    this.http.post(`${environment.apiUrl}/notificaciones/${id}/leida`, {}).subscribe({
      next: () => this._pendientes.update((lista) => lista.filter((n) => n.id !== id)),
    });
  }

  marcarTodasLeidas(): void {
    this.http.post(`${environment.apiUrl}/notificaciones/leidas`, {}).subscribe({
      next: () => this._pendientes.set([]),
    });
  }

  private consultar(): Observable<ResumenNotificaciones> {
    return this.http.get<ResumenNotificaciones>(`${environment.apiUrl}/notificaciones/pendientes`);
  }

  private procesar(resumen: ResumenNotificaciones): void {
    this._pendientes.set(resumen.pendientes);

    // ¿Hay alguno que no habíamos anunciado? Entonces suena la alarma (una
    // sola vez, aunque lleguen varios avisos juntos).
    const nuevos = resumen.pendientes.filter((n) => !this.yaAnunciadas.has(n.id));
    if (nuevos.length > 0) {
      nuevos.forEach((n) => this.yaAnunciadas.add(n.id));
      this.alarma.sonar();
    }
  }

  private reiniciar(): void {
    this.suscripcion?.unsubscribe();
    this.suscripcion = null;
    // Solo tiene sentido reintentar si la sesión sigue viva.
    if (this.auth.usuario()) {
      setTimeout(() => this.iniciar(), this.INTERVALO_MS);
    }
  }
}
