import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import type { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '../servicios/auth.service';
import { NotificacionesService } from '../servicios/notificaciones.service';
import { erroresInterceptor } from './errores.interceptor';

describe('erroresInterceptor', () => {
  let http: HttpClient;
  let controlador: HttpTestingController;
  let auth: { limpiarLocal: jasmine.Spy };
  let avisos: { error: jasmine.Spy };

  beforeEach(() => {
    auth = { limpiarLocal: jasmine.createSpy('limpiarLocal') };
    avisos = { error: jasmine.createSpy('error') };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([erroresInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: NotificacionesService, useValue: avisos },
      ],
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controlador.verify());

  it('muestra el mensaje de la API y limpia la sesión en un 401', () => {
    let capturado: HttpErrorResponse | undefined;

    http.get('/api/v1/ordenes').subscribe({
      error: (error: HttpErrorResponse) => (capturado = error),
    });
    controlador
      .expectOne('/api/v1/ordenes')
      .flush(
        { detail: 'Tu sesión expiró. Vuelve a iniciar sesión.' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(avisos.error).toHaveBeenCalledWith('Tu sesión expiró. Vuelve a iniciar sesión.');
    expect(auth.limpiarLocal).toHaveBeenCalled();
    expect(capturado?.status).toBe(401);
  });

  it('no muestra aviso cuando el 401 viene de /auth/yo', () => {
    http.get('/api/v1/auth/yo').subscribe({ error: () => undefined });

    controlador
      .expectOne('/api/v1/auth/yo')
      .flush({ detail: 'No autenticado' }, { status: 401, statusText: 'Unauthorized' });

    expect(avisos.error).not.toHaveBeenCalled();
    expect(auth.limpiarLocal).toHaveBeenCalled();
  });

  it('deja los 422 al formulario, sin aviso global', () => {
    http.post('/api/v1/ordenes', {}).subscribe({
      error: () => undefined,
    });

    controlador
      .expectOne('/api/v1/ordenes')
      .flush(
        { detail: 'La cantidad es obligatoria' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

    expect(avisos.error).not.toHaveBeenCalled();
  });

  it('muestra el detalle de un error 500', () => {
    http.get('/api/v1/ordenes').subscribe({ error: () => undefined });

    controlador
      .expectOne('/api/v1/ordenes')
      .flush(
        { detail: 'No se pudo generar el reporte.' },
        { status: 500, statusText: 'Internal Server Error' },
      );

    expect(avisos.error).toHaveBeenCalledWith('No se pudo generar el reporte.');
  });

  it('explica cuando no hay conexión con el servidor', () => {
    http.get('/api/v1/ordenes').subscribe({ error: () => undefined });

    controlador.expectOne('/api/v1/ordenes').error(new ProgressEvent('error'));

    expect(avisos.error).toHaveBeenCalledWith(
      'No se pudo contactar al servidor. Revisa la conexión e intenta de nuevo.',
    );
  });
});
