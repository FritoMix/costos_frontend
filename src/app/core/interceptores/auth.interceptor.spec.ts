import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controlador: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controlador.verify());

  it('envía la cookie en las peticiones a la API', () => {
    http.get('/api/v1/ordenes').subscribe();

    const peticion = controlador.expectOne('/api/v1/ordenes');
    expect(peticion.request.withCredentials).toBeTrue();
    peticion.flush([]);
  });

  it('no toca las peticiones que no van a la API', () => {
    http.get('/assets/logo.png').subscribe();

    const peticion = controlador.expectOne('/assets/logo.png');
    expect(peticion.request.withCredentials).toBeFalse();
    peticion.flush('');
  });
});
