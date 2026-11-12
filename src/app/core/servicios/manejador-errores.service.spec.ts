import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { ManejadorErrores } from './manejador-errores.service';

interface AlmacenFalso {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
}

const CLAVE = 'datacontrol.recarga-por-despliegue';

function crearAlmacenFalso(): AlmacenFalso {
  const datos = new Map<string, string>();
  return {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => {
      datos.set(clave, valor);
    },
  };
}

describe('ManejadorErrores', () => {
  let recarga: jasmine.Spy;
  let almacen: AlmacenFalso;
  let manejador: ManejadorErrores;
  let consola: jasmine.Spy;

  beforeEach(() => {
    recarga = jasmine.createSpy('reload');
    almacen = crearAlmacenFalso();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: {
            defaultView: { location: { reload: recarga }, sessionStorage: almacen },
          },
        },
      ],
    });
    manejador = TestBed.inject(ManejadorErrores);
    consola = spyOn(console, 'error');
  });

  it('recarga una vez cuando un despliegue dejó un chunk obsoleto', () => {
    manejador.handleError(
      new Error('Failed to fetch dynamically imported module: /chunk-VIEJO.js'),
    );

    expect(recarga).toHaveBeenCalledTimes(1);
    expect(almacen.getItem(CLAVE)).toBeTruthy();
  });

  it('reconoce también el error clásico de ChunkLoadError', () => {
    manejador.handleError(new Error('ChunkLoadError: Loading chunk 5 failed.'));

    expect(recarga).toHaveBeenCalledTimes(1);
  });

  it('no entra en bucle si el fallo se repite enseguida', () => {
    manejador.handleError(new Error('Loading chunk 5 failed.'));
    manejador.handleError(new Error('Loading chunk 5 failed.'));

    expect(recarga).toHaveBeenCalledTimes(1);
  });

  it('vuelve a permitir la recarga después de la ventana anti-bucle', () => {
    almacen.setItem(CLAVE, String(Date.now() - 61_000));

    manejador.handleError(new Error('Importing a module script failed.'));

    expect(recarga).toHaveBeenCalledTimes(1);
  });

  it('registra los errores normales sin recargar', () => {
    const error = new Error('algo se rompió');

    manejador.handleError(error);

    expect(recarga).not.toHaveBeenCalled();
    expect(consola).toHaveBeenCalledWith(error);
  });
});
