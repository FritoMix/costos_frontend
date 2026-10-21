import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal, type OnDestroy } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

const SEGUNDOS_RECARGA = 20;
const MS_REPROGRAMAR = 5 * 60 * 1000;
const MS_VERIFICAR = 5 * 60 * 1000;

/**
 * Detecta versiones nuevas de la PWA y avisa antes de recargar.
 *
 * El service worker de Angular mantiene la version anterior en memoria hasta
 * que todas las pestañas se cierran. Para no obligar al usuario a limpiar la
 * cache, se muestra un aviso con cuenta regresiva y, si no se pospone, se
 * activa la version nueva y se recarga la pagina.
 */
@Injectable({ providedIn: 'root' })
export class ActualizacionesService implements OnDestroy {
  private readonly swUpdate = inject(SwUpdate);
  private readonly documento = inject(DOCUMENT);

  readonly actualizacionLista = signal(false);
  readonly segundosRestantes = signal(0);

  private cuenta: ReturnType<typeof setInterval> | null = null;
  private verificacion: ReturnType<typeof setInterval> | null = null;
  private reprogramacion: ReturnType<typeof setTimeout> | null = null;
  private recargando = false;

  constructor() {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.swUpdate.versionUpdates.subscribe((evento) => {
      if (evento.type === 'VERSION_READY') {
        this.programarRecarga();
      }
    });

    this.verificarActualizacion();
    this.verificacion = setInterval(() => this.verificarActualizacion(), MS_VERIFICAR);
  }

  /** Activa la version descargada y recarga de inmediato. */
  actualizarAhora(): void {
    if (this.recargando) {
      return;
    }

    this.recargando = true;
    this.detenerCuenta();
    this.limpiarReprogramacion();
    this.actualizacionLista.set(false);

    void this.swUpdate
      .activateUpdate()
      .catch(() => false)
      .finally(() => this.recargarPagina());
  }

  /** Oculta el aviso y vuelve a mostrarlo en unos minutos. */
  posponer(): void {
    this.detenerCuenta();
    this.actualizacionLista.set(false);
    this.limpiarReprogramacion();

    this.reprogramacion = setTimeout(() => {
      this.reprogramacion = null;
      this.programarRecarga();
    }, MS_REPROGRAMAR);
  }

  ngOnDestroy(): void {
    this.detenerCuenta();
    this.limpiarReprogramacion();

    if (this.verificacion) {
      clearInterval(this.verificacion);
      this.verificacion = null;
    }
  }

  private programarRecarga(): void {
    if (this.actualizacionLista()) {
      return;
    }

    this.limpiarReprogramacion();
    this.segundosRestantes.set(SEGUNDOS_RECARGA);
    this.actualizacionLista.set(true);
    this.detenerCuenta();

    this.cuenta = setInterval(() => {
      const restantes = this.segundosRestantes() - 1;
      this.segundosRestantes.set(restantes);

      if (restantes <= 0) {
        this.actualizarAhora();
      }
    }, 1000);
  }

  private verificarActualizacion(): void {
    void this.swUpdate.checkForUpdate().catch(() => false);
  }

  private detenerCuenta(): void {
    if (this.cuenta) {
      clearInterval(this.cuenta);
      this.cuenta = null;
    }
  }

  private limpiarReprogramacion(): void {
    if (this.reprogramacion) {
      clearTimeout(this.reprogramacion);
      this.reprogramacion = null;
    }
  }

  private recargarPagina(): void {
    this.documento.defaultView?.location.reload();
  }
}
