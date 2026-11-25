import { Injectable, inject } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';

import { environment } from '../../../environments/environment';

type Accion = 'abrir_kpi' | 'abrir_nueva_orden' | 'guardar_tanda' | 'guardar_recepcion';

export interface MedicionTurno {
  headers: Record<string, string>;
  terminar: (resultado: 'ok' | 'error') => void;
}

@Injectable({ providedIn: 'root' })
export class MedicionTurnoService {
  private readonly router = inject(Router);
  private readonly ultimoDia = new Map<Accion, string>();
  private navegacion?: { id: number; inicio: number };

  constructor() {
    this.router.events.subscribe(evento => {
      if (evento instanceof NavigationStart) {
        this.navegacion = { id: evento.id, inicio: performance.now() };
      }
    });
  }

  iniciar(accion: Accion): MedicionTurno {
    const apertura = accion === 'abrir_kpi' || accion === 'abrir_nueva_orden';
    const inicio = apertura && this.navegacion && this.router.currentNavigation()?.id === this.navegacion.id
      ? this.navegacion.inicio : performance.now();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const id = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    const dia = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
    const clave = 'dc.medicion.' + accion;
    let primera = this.ultimoDia.get(accion) !== dia;
    this.ultimoDia.set(accion, dia);
    try {
      primera = sessionStorage.getItem(clave) !== dia;
      sessionStorage.setItem(clave, dia);
    } catch { /* Conserva la clasificación en memoria si el navegador bloquea sessionStorage. */ }

    let terminada = false;
    return {
      headers: { 'X-Operacion-ID': id },
      terminar: resultado => {
        if (terminada) return;
        terminada = true;
        const datos = { accion, resultado, primera, operacion_id: id, duracion_ms: Math.round(performance.now() - inicio) };
        // La medición no invalida el caché HTTP ni activa avisos o reintentos de la operación.
        void fetch(environment.apiUrl + '/mediciones/turno', {
          method: 'POST', credentials: 'same-origin', keepalive: true,
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos),
        }).catch(() => undefined);
      },
    };
  }
}
