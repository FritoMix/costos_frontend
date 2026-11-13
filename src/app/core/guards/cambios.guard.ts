import { DestroyRef, inject } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';

import { AuthService } from '../servicios/auth.service';

export interface FormularioProtegido {
  cambiosPendientes(): boolean;
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
  if (!inject(AuthService).usuario() || !pagina.cambiosPendientes()) return true;
  return window.confirm('Tienes cambios sin guardar. ¿Quieres salir y descartarlos?');
};
