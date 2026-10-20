import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { NotificacionesService } from './notificaciones.service';

describe('NotificacionesService', () => {
  let servicio: NotificacionesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(NotificacionesService);
  });

  it('publica un aviso y lo cierra automáticamente', fakeAsync(() => {
    servicio.exito('Se guardó la orden.');

    expect(servicio.avisos().length).toBe(1);
    expect(servicio.avisos()[0].tipo).toBe('exito');
    expect(servicio.avisos()[0].mensaje).toBe('Se guardó la orden.');

    tick(4000);
    expect(servicio.avisos().length).toBe(0);
  }));

  it('deja los errores más tiempo en pantalla', fakeAsync(() => {
    servicio.error('No se pudo guardar.');

    tick(4000);
    expect(servicio.avisos().length).toBe(1);

    tick(4000);
    expect(servicio.avisos().length).toBe(0);
  }));

  it('permite cerrar un aviso manualmente', () => {
    servicio.info('Dato informativo.');
    const id = servicio.avisos()[0].id;

    servicio.cerrar(id);

    expect(servicio.avisos().length).toBe(0);
  });
});
