import { cambiosGuard } from './core/guards/cambios.guard';
import type { Routes } from '@angular/router';

import { rolGuard, sesionGuard } from './core/guards/sesion.guard';
import { ShellComponent } from './layout/shell.component';

/**
 * Mapa de pantallas.
 *
 * Todas se cargan con loadComponent (carga diferida): el navegador solo
 * descarga el codigo de la pantalla que se abre, no el de la app entera.
 * Eso importa en los equipos de planta y en celulares con poca señal.
 */
export const rutas: Routes = [
  {
    path: 'entrar',
    title: 'Entrar - DATACONTROL',
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [sesionGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        title: 'Inicio - DATACONTROL',
        loadComponent: () => import('./features/inicio/inicio.page').then((m) => m.InicioPage),
      },
      {
        path: 'mi-cuenta',
        title: 'Mi cuenta - DATACONTROL',
        loadComponent: () =>
          import('./features/auth/mi-cuenta.page').then((m) => m.MiCuentaPage),
      },

      // --- Ordenes (Supervisor y Administrador) ---
      // Órdenes. Ojo con los permisos: GESTIONAR una orden (listar, crear,
      // editar) es de supervisores y administradores, pero VER el detalle lo
      // puede hacer cualquiera con sesión: el operario necesita abrir la
      // orden que le asignaron, sobre todo desde el aviso que le llega.
      // El backend ya lo permite así; aquí se refleja lo mismo.
      {
        path: 'ordenes',
        children: [
          {
            path: '',
            title: 'Órdenes - DATACONTROL',
            canActivate: [rolGuard(['admin', 'supervisor'])],
            loadComponent: () =>
              import('./features/ordenes/ordenes-lista.page').then((m) => m.OrdenesListaPage),
          },
          {
            path: 'nueva',
            title: 'Nueva orden - DATACONTROL',
            canActivate: [rolGuard(['admin', 'supervisor'])],
            // Alta guiada por pasos (asistente tipo Duolingo). La edición
            // sigue usando el formulario clásico (ver ':id/editar').
            loadComponent: () =>
              import('./features/ordenes/orden-asistente.page').then((m) => m.OrdenAsistentePage),
          },
          {
            path: ':id/editar',
            canDeactivate: [cambiosGuard],
            title: 'Editar orden - DATACONTROL',
            canActivate: [rolGuard(['admin', 'supervisor'])],
            loadComponent: () =>
              import('./features/ordenes/orden-formulario.page').then((m) => m.OrdenFormularioPage),
          },
          {
            // Sin rolGuard: solo exige sesión (la hereda del padre). Los
            // botones de gestión dentro de la pantalla siguen ocultos para
            // quien no es dueño de la orden.
            path: ':id',
            title: 'Orden - DATACONTROL',
            loadComponent: () =>
              import('./features/ordenes/orden-detalle.page').then((m) => …2242 tokens truncated…editar', component: EditorPrueba, canDeactivate: [cambiosGuard] },
          { path: 'salir', component: DestinoPrueba },
        ]),
      ],
    });
  });

  it('cargar valores desde la API no genera una confirmación', async () => {
    const confirmar = spyOn(window, 'confirm');
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/editar', EditorPrueba);
    editor.formulario.patchValue({ nombre: 'Cargado' });
    await harness.navigateByUrl('/salir', DestinoPrueba);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('cancelar conserva la pantalla y los datos; confirmar permite salir', async () => {
    const confirmar = spyOn(window, 'confirm').and.returnValue(false);
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/editar', EditorPrueba);
    editor.formulario.setValue({ nombre: 'Pendiente' });
    editor.formulario.markAsDirty();
    await harness.navigateByUrl('/salir');
    expect(harness.routeDebugElement?.componentInstance).toBe(editor);
    expect(editor.formulario.value.nombre).toBe('Pendiente');
    confirmar.and.returnValue(true);
    await harness.navigateByUrl('/salir', DestinoPrueba);
    expect(confirmar).toHaveBeenCalledTimes(2);
  });

  it('permite salir después de guardar y marcar el formulario limpio', async () => {
    const confirmar = spyOn(window, 'confirm');
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/editar', EditorPrueba);
    editor.formulario.markAsDirty();
    editor.formulario.markAsPristine();
    await harness.navigateByUrl('/salir', DestinoPrueba);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('una sesión terminada puede redirigir sin confirmación', async () => {
    const confirmar = spyOn(window, 'confirm');
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/editar', EditorPrueba);
    editor.formulario.markAsDirty();
    auth.usuario.and.returnValue(null);
    await harness.navigateByUrl('/salir', DestinoPrueba);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('protege recargas y retira el listener al destruir la pantalla', async () => {
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/editar', EditorPrueba);
    editor.formulario.markAsDirty();
    const evento = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBeTrue();
    spyOn(window, 'confirm').and.returnValue(true);
    await harness.navigateByUrl('/salir', DestinoPrueba);
    const despues = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(despues);
    expect(despues.defaultPrevented).toBeFalse();
  });
});
