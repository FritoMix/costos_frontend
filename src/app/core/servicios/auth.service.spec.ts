import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
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
});
