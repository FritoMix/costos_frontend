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
              import('./features/ordenes/orden-detalle.page').then((m) => m.OrdenDetallePage),
          },
        ],
      },

      // --- Registro de horno (Operario de Horno) ---
      {
        path: 'horno',
        canActivate: [rolGuard(['admin', 'operario_horno'])],
        children: [
          {
            path: '',
            title: 'Registro de horno - DATACONTROL',
            loadComponent: () => import('./features/horno/horno-lista.page').then((m) => m.HornoListaPage),
          },
          {
            path: ':id',
            title: 'Registrar tanda - DATACONTROL',
            // Registro guiado paso a paso: el horario se toma solo y cada
            // tanda dura una hora (ver horno-asistente.page.ts).
            loadComponent: () =>
              import('./features/horno/horno-asistente.page').then((m) => m.HornoAsistentePage),
          },
        ],
      },

      // --- Saborizado (Operario de Saborizado) ---
      {
        path: 'saborizado',
        canActivate: [rolGuard(['admin', 'operario_saborizado'])],
        children: [
          {
            path: '',
            title: 'Saborizado - DATACONTROL',
            loadComponent: () =>
              import('./features/saborizado/saborizado-lista.page').then((m) => m.SaborizadoListaPage),
          },
          {
            path: ':id',
            title: 'Registrar recepción - DATACONTROL',
            loadComponent: () =>
              import('./features/saborizado/saborizado-recepcion.page').then(
                (m) => m.SaborizadoRecepcionPage,
              ),
          },
        ],
      },

      // --- Analisis (Administrador) ---
      {
        path: 'analisis',
        title: 'Análisis - DATACONTROL',
        canActivate: [rolGuard(['admin'])],
        loadComponent: () => import('./features/analisis/analisis.page').then((m) => m.AnalisisPage),
      },

      // --- Catalogos (Administrador) ---
      {
        path: 'catalogos',
        canActivate: [rolGuard(['admin'])],
        children: [
          {
            path: '',
            title: 'Catálogos - DATACONTROL',
            loadComponent: () =>
              import('./features/catalogos/catalogos-indice.page').then((m) => m.CatalogosIndicePage),
          },
          {
            path: 'categorias',
            title: 'Categorías - DATACONTROL',
            data: { catalogo: 'categorias' },
            loadComponent: () =>
              import('./features/catalogos/catalogo-simple.page').then((m) => m.CatalogoSimplePage),
          },
          {
            path: 'sabores',
            title: 'Sabores - DATACONTROL',
            data: { catalogo: 'sabores' },
            loadComponent: () =>
              import('./features/catalogos/catalogo-simple.page').then((m) => m.CatalogoSimplePage),
          },
          {
            path: 'tipos-desperdicio',
            title: 'Tipos de desperdicio - DATACONTROL',
            data: { catalogo: 'tipos-desperdicio' },
            loadComponent: () =>
              import('./features/catalogos/catalogo-simple.page').then((m) => m.CatalogoSimplePage),
          },
          {
            path: 'turnos',
            title: 'Turnos - DATACONTROL',
            loadComponent: () => import('./features/catalogos/turnos.page').then((m) => m.TurnosPage),
          },
          {
            path: 'hornos',
            title: 'Hornos - DATACONTROL',
            loadComponent: () => import('./features/catalogos/hornos.page').then((m) => m.HornosPage),
          },
          {
            path: 'productos',
            title: 'Productos - DATACONTROL',
            loadComponent: () =>
              import('./features/catalogos/productos.page').then((m) => m.ProductosPage),
          },
          {
            path: 'configuracion',
            title: 'Configuración - DATACONTROL',
            loadComponent: () =>
              import('./features/catalogos/configuracion.page').then((m) => m.ConfiguracionPage),
          },
          {
            path: 'densidad-aceite',
            title: 'Densidad del aceite - DATACONTROL',
            loadComponent: () =>
              import('./features/catalogos/densidad-aceite.page').then((m) => m.DensidadAceitePage),
          },
        ],
      },

      // --- Usuarios (Administrador) ---
      {
        path: 'usuarios',
        canActivate: [rolGuard(['admin'])],
        children: [
          {
            path: '',
            title: 'Usuarios - DATACONTROL',
            loadComponent: () =>
              import('./features/usuarios/usuarios-lista.page').then((m) => m.UsuariosListaPage),
          },
          {
            path: 'nuevo',
            title: 'Nuevo usuario - DATACONTROL',
            loadComponent: () =>
              import('./features/usuarios/usuario-formulario.page').then(
                (m) => m.UsuarioFormularioPage,
              ),
          },
          {
            path: ':id',
            title: 'Editar usuario - DATACONTROL',
            loadComponent: () =>
              import('./features/usuarios/usuario-formulario.page').then(
                (m) => m.UsuarioFormularioPage,
              ),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
