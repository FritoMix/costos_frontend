import { DestroyRef, inject } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';

import { AuthService } from '../servicios/auth.service';
import { NotificacionesService } from '../servicios/notificaciones.service';

export interface FormularioProtegido {
  cambiosPendientes(): boolean;
  operacionPendiente?(): boolean;
}

/** No persiste valores de formularios ni contraseñas en el navegador. */
export function protegerRecarga(pendientes: () => boolean): void {
  const auth = inject(AuthService);
  const comprobar = (evento: BeforeUnloadEvent): void => {
    if (auth.usuario() && pendientes()) {
      evento.preventDefault();
      evento.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', comprobar);
  inject(DestroyRef).onDestroy(() => window.removeEventListener('beforeunload', comprobar));
}

export const cambiosGuard: CanDeactivateFn<FormularioProtegido> = (pagina) => {
  // Un cierre de sesión o un 401 debe poder llevar al acceso sin bloquearse.
  if (!inject(AuthService).usuario()) return true;
  if (pagina.operacionPendiente?.()) {
    inject(NotificacionesService).error('Espera a que termine la operación antes de salir.');
    return false;
  }
  if (!pagina.cambiosPendientes()) return true;
  return window.confirm('Tienes cambios sin guardar. ¿Quieres salir y descartarlos?');
};

/** Compara solo datos editables; la pantalla acepta cargas y guardados explícitamente. */
export function seguirCambios(leer: () => unknown, ocupado: () => boolean) {
  const auth = inject(AuthService);
  let guardado = JSON.stringify(leer());
  const pendientes = (): boolean => ocupado() || JSON.stringify(leer()) !== guardado;
  protegerRecarga(pendientes);
  return {
    pendientes,
    ocupado,
    aceptar: (): void => {
      guardado = JSON.stringify(leer());
    },
    confirmarDescarte: (): boolean =>
      !auth.usuario() ||
      (!ocupado() &&
        (!pendientes() ||
          window.confirm('Tienes cambios sin guardar. ¿Quieres descartarlos y continuar?'))),
  };
}
