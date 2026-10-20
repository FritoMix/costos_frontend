import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { UrlTree, provideRouter, Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import type { CodigoRol, Usuario } from '../modelos/identidad.model';
import { AuthService } from '../servicios/auth.service';
import { NotificacionesService } from '../servicios/notificaciones.service';
import { rolGuard, sesionGuard } from './sesion.guard';

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

describe('sesionGuard', () => {
  let auth: {
    usuario: jasmine.Spy;
    recuperarSesion: jasmine.Spy;
    rol: jasmine.Spy;
    rutaInicial: jasmine.Spy;
  };
  let avisos: { error: jasmine.Spy };

  const estado = { url: '/ordenes' } as RouterStateSnapshot;

  beforeEach(() => {
    auth = {
      usuario: jasmine.createSpy('usuario').and.returnValue(null),
      recuperarSesion: jasmine.createSpy('recuperarSesion'),
      rol: jasmine.createSpy('rol').and.returnValue(null),
      rutaInicial: jasmine.createSpy('rutaInicial').and.returnValue('/inicio'),
    };
    avisos = { error: jasmine.createSpy('error') };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: NotificacionesService, useValue: avisos },
      ],
    });
  });

  it('deja pasar si ya hay un usuario cargado', () => {
    auth.usuario.and.returnValue(usuario('admin'));

    const resultado = TestBed.runInInjectionContext(() =>
      sesionGuard({} as ActivatedRouteSnapshot, estado),
    );

    expect(resultado).toBeTrue();
  });

  it('recupera la sesión desde la API', (done) => {
    auth.recuperarSesion.and.returnValue(of(usuario('admin')));

    const resultado = TestBed.runInInjectionContext(() =>
      sesionGuard({} as ActivatedRouteSnapshot, estado),
    );
    if (!(resultado instanceof Observable)) {
      fail('El guard debería devolver un Observable');
      return;
    }

    resultado.subscribe((valor) => {
      expect(valor).toBeTrue();
      done();
    });
  });

  it('manda al login si no hay sesión', (done) => {
    auth.recuperarSesion.and.returnValue(throwError(() => new Error('401')));

    const resultado = TestBed.runInInjectionContext(() =>
      sesionGuard({} as ActivatedRouteSnapshot, estado),
    );
    if (!(resultado instanceof Observable)) {
      fail('El guard debería devolver un Observable');
      return;
    }

    resultado.subscribe((valor) => {
      expect(valor instanceof UrlTree).toBeTrue();
      expect((valor as UrlTree).toString()).toBe('/entrar?volverA=%2Fordenes');
      done();
    });
  });
});

describe('rolGuard', () => {
  let auth: {
    usuario: jasmine.Spy;
    recuperarSesion: jasmine.Spy;
    rol: jasmine.Spy;
    rutaInicial: jasmine.Spy;
  };
  let avisos: { error: jasmine.Spy };
  let router: Router;

  beforeEach(() => {
    auth = {
      usuario: jasmine.createSpy('usuario').and.returnValue(null),
      recuperarSesion: jasmine.createSpy('recuperarSesion'),
      rol: jasmine.createSpy('rol').and.returnValue(null),
      rutaInicial: jasmine.createSpy('rutaInicial').and.returnValue('/inicio'),
    };
    avisos = { error: jasmine.createSpy('error') };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: NotificacionesService, useValue: avisos },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('permite el rol autorizado', () => {
    auth.rol.and.returnValue('admin');

    const resultado = TestBed.runInInjectionContext(() => {
      const guard = rolGuard(['admin']);
      return guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot);
    });

    expect(resultado).toBeTrue();
    expect(avisos.error).not.toHaveBeenCalled();
  });

  it('rechaza un rol no autorizado y avisa', () => {
    auth.rol.and.returnValue('supervisor');
    auth.rutaInicial.and.returnValue('/ordenes');

    const resultado = TestBed.runInInjectionContext(() => {
      const guard = rolGuard(['admin']);
      return guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot);
    });

    expect(resultado instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(resultado as UrlTree)).toBe('/ordenes');
    expect(avisos.error).toHaveBeenCalledWith('No tienes permiso para esa sección.');
  });
});
