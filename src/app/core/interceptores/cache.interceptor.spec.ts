import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { CACHE, cacheInterceptor, limpiarCache } from './cache.interceptor';

const URL = '/api/v1/catalogos';

function contexto(ttl: boolean | number = true): HttpContext {
  return new HttpContext().set(CACHE, ttl);
}

describe('cacheInterceptor', () => {
  let http: HttpClient;
  let controlador: HttpTestingController;

  beforeEach(() => {
    limpiarCache();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([cacheInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controlador.verify();
    limpiarCache();
  });

  it('reutiliza la respuesta de un GET cacheado', () => {
    let primera: unknown;
    let segunda: unknown;

    http.get(URL, { context: contexto() }).subscribe((valor) => (primera = valor));
    controlador.expectOne(URL).flush([{ id: 1 }]);

    http.get(URL, { context: contexto() }).subscribe((valor) => (segunda = valor));

    controlador.expectNone(URL);
    expect(segunda).toEqual([{ id: 1 }]);
    expect(primera).toEqual(segunda);
  });

  it('no cachea si la petición no lo pide', () => {
    let primera: unknown;
    let segunda: unknown;

    http.get(URL).subscribe((valor) => (primera = valor));
    controlador.expectOne(URL).flush([{ id: 1 }]);

    http.get(URL).subscribe((valor) => (segunda = valor));
    controlador.expectOne(URL).flush([{ id: 2 }]);

    expect(primera).toEqual([{ id: 1 }]);
    expect(segunda).toEqual([{ id: 2 }]);
  });

  it('invalida toda la caché al mutar datos', () => {
    let segunda: unknown;

    http.get(URL, { context: contexto() }).subscribe();
    controlador.expectOne(URL).flush([{ id: 1 }]);

    http.post('/api/v1/ordenes', {}).subscribe();
    controlador.expectOne('/api/v1/ordenes').flush({});

    http.get(URL, { context: contexto() }).subscribe((valor) => (segunda = valor));
    controlador.expectOne(URL).flush([{ id: 2 }]);

    expect(segunda).toEqual([{ id: 2 }]);
  });

  it('respeta el TTL configurado', fakeAsync(() => {
    let segunda: unknown;

    http.get(URL, { context: contexto(100) }).subscribe();
    controlador.expectOne(URL).flush([{ id: 1 }]);

    tick(150);

    http.get(URL, { context: contexto(100) }).subscribe((valor) => (segunda = valor));
    controlador.expectOne(URL).flush([{ id: 2 }]);

    expect(segunda).toEqual([{ id: 2 }]);
    tick(100);
  }));
  it('no restaura una lectura anterior después de limpiar la sesión', () => {
    http.get(URL, { context: contexto() }).subscribe();
    const pendiente = controlador.expectOne(URL);
    limpiarCache();
    pendiente.flush([{ id: 1 }]);
    http.get(URL, { context: contexto() }).subscribe();
    controlador.expectOne(URL).flush([{ id: 2 }]);
  });

  it('invalida lecturas iniciadas mientras se guardaban cambios', () => {
    http.post('/api/v1/ordenes', {}).subscribe();
    const escritura = controlador.expectOne('/api/v1/ordenes');
    http.get(URL, { context: contexto() }).subscribe();
    const lectura = controlador.expectOne(URL);
    escritura.flush({});
    lectura.flush([{ id: 1 }]);
    http.get(URL, { context: contexto() }).subscribe();
    controlador.expectOne(URL).flush([{ id: 2 }]);
  });

  it('no almacena eventos de progreso como respuestas', () => {
    http.get(URL, { context: contexto(), reportProgress: true }).subscribe();
    const pendiente = controlador.expectOne(URL);
    pendiente.event({ type: 3, loaded: 5 });
    http.get(URL, { context: contexto() }).subscribe();
    const segunda = controlador.expectOne(URL);
    pendiente.flush([{ id: 1 }]);
    segunda.flush([{ id: 2 }]);
  });

});
