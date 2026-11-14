import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SaborizadoListaPage } from '../saborizado/saborizado-lista.page';
import { HornoListaPage } from './horno-lista.page';

const fila = {
  id: 1,
  numero_orden: 'OP-SIMULADA',
  formula_estado: 'lista',
  estado: 'pendiente',
  producto: { nombre_comercial: 'Papa ficticia' },
  categoria: { nombre: 'Papa' },
  horno: { id: 1, nombre: 'Horno ficticio' },
  turno: { nombre: 'Mañana' },
  cantidad_programada: 100,
  horas_produccion: 1,
};

for (const pagina of [HornoListaPage, SaborizadoListaPage] as Type<unknown>[]) {
  describe(`Experiencia de operación: ${pagina.name}`, () => {
    let http: HttpTestingController;
    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [pagina],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      });
      http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => http.verify());

    function responder(pendientes = [fila], activas: (typeof fila)[] = []) {
      const solicitudes = http.match((r) => r.url === '/api/v1/ordenes');
      expect(solicitudes.length).toBe(2);
      for (const solicitud of solicitudes) {
        solicitud.flush(
          solicitud.request.params.get('estado') === 'pendiente' ? pendientes : activas,
        );
      }
    }

    it('bloquea dobles envíos y el inicio de otra orden mientras espera', () => {
      const fixture = TestBed.createComponent(pagina);
      responder([fila, { ...fila, id: 2 }]);
      fixture.detectChanges();
      const uno = fixture.nativeElement.querySelector(
        '[data-testid="tomar-orden-1"]',
      ) as HTMLButtonElement;
      const dos = fixture.nativeElement.querySelector(
        '[data-testid="tomar-orden-2"]',
      ) as HTMLButtonElement;
      uno.click();
      uno.click();
      dos.click();
      const inicio = http.expectOne('/api/v1/ordenes/1/iniciar');
      http.expectNone('/api/v1/ordenes/2/iniciar');
      fixture.detectChanges();
      expect(uno.disabled).toBeTrue();
      expect(dos.disabled).toBeTrue();
      inicio.flush(fila);
      responder([]);
      fixture.destroy();
    });

    it('muestra el fallo de carga y permite reintentar sin mostrar un vacío falso', () => {
      const fixture = TestBed.createComponent(pagina);
      const solicitudes = http.match((r) => r.url === '/api/v1/ordenes');
      solicitudes[0].flush({}, { status: 503, statusText: 'No disponible' });
      expect(solicitudes[1].cancelled).toBeTrue();
      fixture.detectChanges();
      const alerta = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
      expect(alerta.textContent).toContain('No se pudo cargar');
      expect(fixture.nativeElement.textContent).not.toContain('No hay órdenes en producción');
      alerta.querySelector('button')!.click();
      responder([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('No hay órdenes en producción');
      fixture.destroy();
    });

    it('actualiza la lista ante conflicto con otro trabajador y desbloquea controles', () => {
      const fixture = TestBed.createComponent(pagina);
      responder();
      fixture.detectChanges();
      (
        fixture.nativeElement.querySelector('[data-testid="tomar-orden-1"]') as HTMLButtonElement
      ).click();
      http
        .expectOne('/api/v1/ordenes/1/iniciar')
        .flush({}, { status: 409, statusText: 'Conflicto' });
      responder([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
        'No se confirmó',
      );
      expect(
        (
          fixture.nativeElement.querySelector(
            '[data-testid="actualizar-operaciones"]',
          ) as HTMLButtonElement
        ).disabled,
      ).toBeFalse();
      fixture.destroy();
    });

    it('indica y bloquea un horno ocupado sin impedir actualizar la lista', () => {
      const fixture = TestBed.createComponent(pagina);
      responder([fila], [{ ...fila, id: 2, estado: 'en_produccion' }]);
      fixture.detectChanges();
      expect(
        (fixture.nativeElement.querySelector('[data-testid="tomar-orden-1"]') as HTMLButtonElement)
          .disabled,
      ).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain('Horno ocupado por otra orden');
      expect(
        (
          fixture.nativeElement.querySelector(
            '[data-testid="actualizar-operaciones"]',
          ) as HTMLButtonElement
        ).disabled,
      ).toBeFalse();
      fixture.destroy();
    });

    it('consulta la fórmula activa al iniciar y cancela lecturas al salir', () => {
      const fixture = TestBed.createComponent(pagina);
      responder([{ ...fila, formula_estado: 'sin_formula' }]);
      fixture.detectChanges();
      expect(
        (fixture.nativeElement.querySelector('[data-testid="tomar-orden-1"]') as HTMLButtonElement)
          .disabled,
      ).toBeFalse();
      const boton = fixture.nativeElement.querySelector('[data-testid="tomar-orden-1"]') as HTMLButtonElement;
      boton.click();
      boton.click();
      const inicio = http.expectOne('/api/v1/ordenes/1/iniciar');
      expect(inicio.request.method).toBe('POST');
      inicio.flush({ detail: 'Este producto no tiene una fórmula activa.' }, { status: 400, statusText: 'Bad Request' });
      responder([{ ...fila, formula_estado: 'sin_formula' }]);
      fixture.detectChanges();
      expect(boton.disabled).toBeFalse();
      (
        fixture.nativeElement.querySelector(
          '[data-testid="actualizar-operaciones"]',
        ) as HTMLButtonElement
      ).click();
      const solicitudes = http.match((r) => r.url === '/api/v1/ordenes');
      fixture.destroy();
      expect(solicitudes.every((s) => s.cancelled)).toBeTrue();
    });
  });
}
