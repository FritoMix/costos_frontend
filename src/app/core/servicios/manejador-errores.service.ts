import { DOCUMENT } from '@angular/common';
import type { ErrorHandler } from '@angular/core';
import { Injectable, inject } from '@angular/core';

/**
 * Recupera la aplicación cuando un despliegue deja los archivos viejos.
 *
 * La PWA sirve la versión cacheada. Si mientras tanto se publica una versión
 * nueva, el navegador puede pedir un chunk con un nombre que ya no existe y
 * la pantalla queda en blanco (ChunkLoadError). En vez de dejar al usuario
 * atrapado, se recarga UNA sola vez para bajar la versión nueva.
 *
 * El aviso normal de "nueva versión" (ActualizacionesService) sigue siendo el
 * camino principal; esto es la red de seguridad para cuando el fallo ocurre
 * antes de que el aviso alcance a mostrarse.
 */
const CLAVE_MARCA = 'datacontrol.recarga-por-despliegue';

/** Ventana para no entrar en un bucle de recargas si el servidor falla de verdad. */
const MS_ENTRE_RECARGAS = 60_000;

const PATRONES_CHUNK_OBSOLETO = [
  /Loading chunk .* failed/i,
  /ChunkLoadError/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
];

interface AlmacenSesion {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
}

@Injectable({ providedIn: 'root' })
export class ManejadorErrores implements ErrorHandler {
  private readonly documento = inject(DOCUMENT);

  handleError(error: unknown): void {
    if (this.esChunkObsoleto(error) && this.puedeRecargar()) {
      this.marcarRecarga();
      this.documento.defaultView?.location.reload();
      return;
    }
    // El resto de errores no se silencian: quedan en consola como siempre.
    console.error(error);
  }

  private esChunkObsoleto(error: unknown): boolean {
    const mensaje = error instanceof Error ? error.message : String(error ?? '');
    return PATRONES_CHUNK_OBSOLETO.some((patron) => patron.test(mensaje));
  }

  private puedeRecargar(): boolean {
    const almacen = this.almacen();
    if (!almacen) {
      return false;
    }
    const ultima = Number(almacen.getItem(CLAVE_MARCA) ?? 0);
    return !Number.isFinite(ultima) || Date.now() - ultima > MS_ENTRE_RECARGAS;
  }

  private marcarRecarga(): void {
    this.almacen()?.setItem(CLAVE_MARCA, String(Date.now()));
  }

  /** sessionStorage de la ventana; null si el navegador lo tiene bloqueado. */
  private almacen(): AlmacenSesion | null {
    try {
      return this.documento.defaultView?.sessionStorage ?? null;
    } catch {
      return null;
    }
  }
}
