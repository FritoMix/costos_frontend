import { Injectable, signal } from '@angular/core';

export type TipoAviso = 'exito' | 'error' | 'info';

export interface Aviso {
  id: number;
  tipo: TipoAviso;
  mensaje: string;
}

/**
 * Avisos flotantes ("se guardó", "no se pudo eliminar").
 *
 * Cualquier parte de la app puede publicar uno; el componente
 * <app-avisos> del layout es el unico que los dibuja.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private contador = 0;
  private readonly _avisos = signal<Aviso[]>([]);
  readonly avisos = this._avisos.asReadonly();

  exito(mensaje: string): void {
    this.publicar('exito', mensaje);
  }

  error(mensaje: string): void {
    this.publicar('error', mensaje);
  }

  info(mensaje: string): void {
    this.publicar('info', mensaje);
  }

  cerrar(id: number): void {
    this._avisos.update((avisos) => avisos.filter((aviso) => aviso.id !== id));
  }

  private publicar(tipo: TipoAviso, mensaje: string): void {
    const id = ++this.contador;
    this._avisos.update((avisos) => [...avisos, { id, tipo, mensaje }]);
    // Los errores se quedan mas tiempo: el operario tiene que alcanzar a leerlos.
    setTimeout(() => this.cerrar(id), tipo === 'error' ? 8000 : 4000);
  }
}
