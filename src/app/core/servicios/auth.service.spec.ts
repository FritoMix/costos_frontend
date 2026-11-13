import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import type { CodigoRol, RespuestaLogin, Usuario } from '../modelos/identidad.model';
import { AuthService } from './auth.service';

function usuario(codigo: CodigoRol): Usuario {
  return {
    id: 1,
    nombre_completo: 'Ana Pérez',
    nombre_usuario: 'ana',
    activo: true,
    fecha_creacion: '2026-01-01T00:00:00Z',
    rol: { id: 1, codigo, nombre: codigo },
  };
}

describe('AuthService', () => {
  let servicio: AuthService;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    servicio = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  it('arranca sin sesión', () => {
    expect(servicio.usuario()).toBeNull();
    expect(servicio.sesionVerificada()).toBeFalse();
    expect(servicio.rol()).toBeNull();
    expect(servicio.rutaInicial()).toBe('/inicio');
  });

  it('guarda el usuario al iniciar sesión', () => {
    let respuesta: RespuestaLogin | undefined;

    servicio
      .iniciarSesion({ nombre_usuario: 'ana', password: 'secreta' })
      .subscribe((valor) => (respuesta = valor));

    const peticion = http.expectOne('/api/v1/auth/login');
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({
      nombre_usuario: 'ana',
      password: 'secreta',
    });
    peticion.flush({
      expira_en_segundos: 28800,
      usuario: usuario('supervisor'),
    });

    expect(respuesta?.usuario.rol.codigo).toBe('supervisor');
    expect(servicio.usuario()?.nombre_usuario).toBe('ana');
    expect(servicio.sesionVerificada()).toBeTrue();
    expect(servicio.esSupervisor()).toBeTrue();
    expect(servicio.rutaInicial()).toBe('/ordenes');
  });

  it('recupera la sesión desde /auth/yo', () => {
    servicio.recuperarSesion().subscribe();

    http.expectOne('/api/v1/auth/yo').flush(usuario('operario_horno'));

    expect(servicio.usuario()?.rol.codigo).toBe('operario_horno');
    expect(servicio.sesionVerificada()).toBeTrue();
    expect(servicio.rutaInicial()).toBe('/horno');
  });

  it('calcula la ruta inicial de cada rol', () => {
    const casos: Array<[CodigoRol, string]> = [
      ['admin', '/inicio'],
      ['supervisor', '/ordenes'],
      ['operario_horno', '/horno'],
      ['operario_saborizado', '/saborizado'],
      ['bodeguero', '/bodega'],
    ];

    for (const [codigo, ruta] of casos) {
      servicio.iniciarSesion({ nombre_usuario: codigo, password: 'x' }).subscribe();
      http
        .expectOne('/api/v1/auth/login')
        .flush({ expira_en_segundos: 100, usuario: usuario(codigo) });

      expect(servicio.rutaInicial()).toBe(ruta);
    }
  });

  it('cierra la sesión en el servidor y navega al login', () => {
    const navegar = spyOn(router, 'navigate').and.resolveTo(true);
    servicio.iniciarSesion({ nombre_usuario: 'ana', password: 'x' }).subscribe();
    http
      .expectOne('/api/v1/auth/login')
      .flush({ expira_en_segundos: 100, usuario: usuario('admin') });

    servicio.cerrarSesion();

    http.expectOne('/api/v1/auth/logout').flush({});

    expect(servicio.usuario()).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/entrar']);
  });

  it('limpia el estado local sin llamar a la API', () => {
    const navegar = spyOn(router, 'navigate').and.resolveTo(true);
    servicio.iniciarSesion({ nombre_usuario: 'ana', password: 'x' }).subscribe();
    http
      .expectOne('/api/v1/auth/login')
      .flush({ expira_en_segundos: 100, usuario: usuario('admin') });

    servicio.limpiarLocal(false);

    expect(servicio.usuario()).toBeNull();
    expect(servicio.sesionVerificada()).toBeTrue();
    expect(navegar).not.toHaveBeenCalled();
  });
  it('cierra por inactividad aunque haya consultas automáticas', fakeAsync(() => {
    spyOn(router, 'navigate').and.resolveTo(true);
    servicio.iniciarSesion({ nombre_usuario: 'ana', password: 'x' }).subscribe();
    http.expectOne('/api/v1/auth/login').flush({
      expira_en_segundos: 28800,
      inactividad_segundos: 60,
      usuario: usuario('admin'),
    });
    tick(30_000);
    TestBed.inject(HttpClient).get('/api/v1/notificaciones').subscribe();
    http.expectOne('/api/v1/notificaciones').flush([]);
    tick(30_000);
    http.expectOne('/api/v1/auth/logout').flush(null);
    expect(servicio.usuario()).toBeNull();
    tick(4_000);
  }));

  it('renueva por interacción y evita latidos en cada tecla', fakeAsync(() => {
    spyOn(router, 'navigate').and.resolveTo(true);
    servicio.iniciarSesion({ nombre_usuario: 'ana', password: 'x' }).subscribe();
    http.expectOne('/api/v1/auth/login').flush({
      expira_en_segundos: 28800,
      inactividad_segundos: 120,
      usuario: usuario('admin'),
    });
    tick(40_000);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    http.expectOne('/api/v1/auth/actividad').flush(null);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
    http.expectNone('/api/v1/auth/actividad');
    tick(80_000);
    expect(servicio.usuario()).not.toBeNull();
    tick(40_000);
    http.expectOne('/api/v1/auth/logout').flush(null);
    expect(servicio.usuario()).toBeNull();
    tick(4_000);
  }));

  it('evita cierres duplicados mientras el servidor responde', () => {
    spyOn(router, 'navigate').and.resolveTo(true);
    servicio.cerrarSesion();
    servicio.cerrarSesion();
    http.expectOne('/api/v1/auth/logout').flush(null);
    http.expectNone('/api/v1/auth/logout');
  });
});
