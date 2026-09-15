/**
 * Configuracion del frontend.
 *
 * La URL de la API es relativa a proposito: en produccion Nginx sirve la
 * app y reenvia /api al contenedor de la API (ver nginx.conf), y en
 * desarrollo "ng serve" hace lo mismo con proxy.conf.json. Asi el
 * navegador siempre habla con un solo origen: no hay CORS ni URLs
 * distintas por entorno.
 */
export const environment = {
  produccion: false,
  apiUrl: '/api/v1',
  /** Nombre visible de la aplicacion. */
  appNombre: 'DATACONTROL',
  empresa: 'Productos Alimenticios Fritomix SAS',
};
