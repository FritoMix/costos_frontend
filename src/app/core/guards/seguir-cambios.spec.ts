import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '../servicios/auth.service';
import { seguirCambios } from './cambios.guard';

describe('seguimiento de datos editables', () => {
  let usuario: jasmine.Spy;
  beforeEach(() => {
    usuario = jasmine.createSpy().and.returnValue({ id: 1 });
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { usuario } }],
    });
  });

  it('acepta la carga de datos existentes como punto de partida', () => {
    let datos = { nombre: '', cantidades: [1] };
    const proteccion = TestBed.runInInjectionContext(() =>
      seguirCambios(
        () => datos,
        () => false,
      ),
    );
    expect(proteccion.pendientes()).toBeFalse();
    datos = { nombre: 'Fórmula cargada', cantidades: [10, 20] };
    proteccion.aceptar();
    const confirmar = spyOn(window, 'confirm');
    expect(proteccion.confirmarDescarte()).toBeTrue();
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('detecta cambios en filas y deja de avisar si se restauran los originales', () => {
    const filas = [{ bultos: 10 }];
    const proteccion = TestBed.runInInjectionContext(() =>
      seguirCambios(
        () => filas,
        () => false,
      ),
    );
    filas[0].bultos = 12;
    expect(proteccion.pendientes()).toBeTrue();
    filas[0].bultos = 10;
    expect(proteccion.pendientes()).toBeFalse();
  });

  it('cancelar un descarte conserva la selección y continúa avisando', () => {
    const valor = signal('Original');
    const proteccion = TestBed.runInInjectionContext(() => seguirCambios(valor, () => false));
    valor.set('Pendiente');
    spyOn(window, 'confirm').and.returnValue(false);
    expect(proteccion.confirmarDescarte()).toBeFalse();
    expect(valor()).toBe('Pendiente');
    expect(proteccion.pendientes()).toBeTrue();
  });

  it('confirmar descartar no marca por sí solo los datos como guardados', () => {
    const valor = signal(1);
    const proteccion = TestBed.runInInjectionContext(() => seguirCambios(valor, () => false));
    valor.set(2);
    spyOn(window, 'confirm').and.returnValue(true);
    expect(proteccion.confirmarDescarte()).toBeTrue();
    expect(proteccion.pendientes()).toBeTrue();
    proteccion.aceptar();
    expect(proteccion.pendientes()).toBeFalse();
  });

  it('una escritura pendiente protege la salida incluso sin cambios de campos', () => {
    const ocupado = signal(false);
    const proteccion = TestBed.runInInjectionContext(() => seguirCambios(() => 'dato', ocupado));
    ocupado.set(true);
    expect(proteccion.pendientes()).toBeTrue();
    const confirmar = spyOn(window, 'confirm');
    expect(proteccion.confirmarDescarte()).toBeFalse();
    expect(confirmar).not.toHaveBeenCalled();
    ocupado.set(false);
    expect(proteccion.pendientes()).toBeFalse();
  });

  it('un cierre de sesión no queda bloqueado por un borrador', () => {
    const valor = signal(1);
    const proteccion = TestBed.runInInjectionContext(() => seguirCambios(valor, () => false));
    valor.set(2);
    usuario.and.returnValue(null);
    const confirmar = spyOn(window, 'confirm');
    expect(proteccion.confirmarDescarte()).toBeTrue();
    expect(confirmar).not.toHaveBeenCalled();
  });
});
