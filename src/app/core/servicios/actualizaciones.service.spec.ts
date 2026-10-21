import { DOCUMENT } from '@angular/common';
import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';

import { ActualizacionesService } from './actualizaciones.service';

describe('ActualizacionesService', () => {
  let servicio: ActualizacionesService;
  let versionUpdates: Subject<VersionEvent>;
  let checkForUpdate: jasmine.Spy;
  let activateUpdate: jasmine.Spy;
  let recargar: jasmine.Spy;

  const anunciarVersion = (): void => {
    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'actual' },
      latestVersion: { hash: 'nueva' },
    });
  };

  beforeEach(() => {
    versionUpdates = new Subject<VersionEvent>();
    checkForUpdate = jasmine.createSpy('checkForUpdate').and.returnValue(Promise.resolve(false));
    activateUpdate = jasmine.createSpy('activateUpdate').and.returnValue(Promise.resolve(true));
    recargar = jasmine.createSpy('reload');

    const documento = {
      defaultView: { location: { reload: recargar } },
    } as unknown as Document;

    TestBed.configureTestingModule({
      providers: [
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: true,
            versionUpdates: versionUpdates.asObservable(),
            checkForUpdate,
            activateUpdate,
          },
        },
        { provide: DOCUMENT, useValue: documento },
      ],
    });

    servicio = TestBed.inject(ActualizacionesService);
  });

  afterEach(() => servicio.ngOnDestroy());

  it('consulta actualizaciones al iniciar sin mostrar el aviso', () => {
    expect(checkForUpdate).toHaveBeenCalled();
    expect(servicio.actualizacionLista()).toBeFalse();
  });

  it('muestra el aviso y recarga al agotarse la cuenta regresiva', fakeAsync(() => {
    anunciarVersion();

    expect(servicio.actualizacionLista()).toBeTrue();
    expect(servicio.segundosRestantes()).toBe(20);

    tick(20_000);
    expect(activateUpdate).toHaveBeenCalled();

    flushMicrotasks();
    expect(recargar).toHaveBeenCalled();

    servicio.ngOnDestroy();
  }));

  it('permite posponer y vuelve a avisar a los cinco minutos', fakeAsync(() => {
    anunciarVersion();
    servicio.posponer();

    expect(servicio.actualizacionLista()).toBeFalse();

    tick(5 * 60 * 1000);

    expect(servicio.actualizacionLista()).toBeTrue();
    expect(servicio.segundosRestantes()).toBe(20);

    servicio.ngOnDestroy();
  }));

  it('activa y recarga de inmediato cuando el usuario lo pide', fakeAsync(() => {
    anunciarVersion();
    servicio.actualizarAhora();

    flushMicrotasks();

    expect(activateUpdate).toHaveBeenCalled();
    expect(recargar).toHaveBeenCalled();

    servicio.ngOnDestroy();
  }));
});
