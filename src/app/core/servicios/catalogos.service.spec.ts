import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { ItemCatalogo } from '../modelos/catalogos.model';
import { CatalogosService } from './catalogos.service';

describe('CatalogosService', () => {
  let servicio: CatalogosService;
  let http: HttpTestingController;

  const categoria: ItemCatalogo = { id: 1, nombre: 'Papa Hojuela', activo: true };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(CatalogosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista categorías activas con el parámetro correcto', () => {
    servicio.listarCategorias(true).subscribe((datos) => expect(datos).toEqual([categoria]));

    const peticion = http.expectOne((req) => req.url === '/api/v1/catalogos/categorias');
    expect(peticion.request.params.get('solo_activas')).toBe('true');
    peticion.flush([categoria]);
  });

  it('reutiliza la caché en memoria para listados sin filtro', () => {
    let primera: ItemCatalogo[] | undefined;
    let segunda: ItemCatalogo[] | undefined;

    servicio.listarCategorias().subscribe((datos) => (primera = datos));
    servicio.listarCategorias().subscribe((datos) => (segunda = datos));

    const peticiones = http.match((req) => req.url === '/api/v1/catalogos/categorias');
    expect(peticiones.length).toBe(1);
    peticiones[0].flush([categoria]);

    expect(primera).toEqual([categoria]);
    expect(segunda).toEqual([categoria]);
  });

  it('invalida la caché al crear un catálogo', () => {
    servicio.listarCategorias().subscribe();
    http.expectOne((req) => req.url === '/api/v1/catalogos/categorias').flush([categoria]);

    servicio.crearCategoria({ nombre: 'Papa Rizada', activo: true }).subscribe();
    const crear = http.expectOne('/api/v1/catalogos/categorias');
    expect(crear.request.method).toBe('POST');
    crear.flush({ id: 2, nombre: 'Papa Rizada', activo: true });

    servicio.listarCategorias().subscribe();
    http.expectOne((req) => req.url === '/api/v1/catalogos/categorias').flush([categoria]);
  });

  it('permite forzar una lectura fresca y limpiar toda la caché', () => {
    servicio.listarTurnos().subscribe();
    const primera = http.expectOne((req) => req.url === '/api/v1/catalogos/turnos');
    expect(primera.request.params.get('solo_activos')).toBe('false');
    primera.flush([]);

    servicio.listarTurnos(false, true).subscribe();
    const fresca = http.expectOne((req) => req.url === '/api/v1/catalogos/turnos');
    expect(fresca.request.params.get('solo_activos')).toBe('false');
    fresca.flush([]);

    servicio.limpiarCache();
    servicio.listarTurnos().subscribe();
    const trasLimpiar = http.expectOne((req) => req.url === '/api/v1/catalogos/turnos');
    expect(trasLimpiar.request.params.get('solo_activos')).toBe('false');
    trasLimpiar.flush([]);
  });

  it('actualiza solo la capacidad de un horno con PATCH', () => {
    servicio.actualizarCapacidadHorno(4, { capacidad_bultos_hora: 50 }).subscribe();

    const peticion = http.expectOne('/api/v1/catalogos/hornos/4/capacidad');
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toEqual({ capacidad_bultos_hora: 50 });
    peticion.flush({
      id: 4,
      nombre: 'Horno 1',
      activo: true,
      tipo_aceite: null,
      apto_exportacion: false,
      tanque_diametro_cm: null,
      litros_por_cm_manual: null,
      litros_por_cm: null,
      capacidad_bultos_hora: 50,
      categorias: [],
    });
  });

  it('consulta la configuración de planta una sola vez', () => {
    servicio.verConfiguracion().subscribe();
    servicio.verConfiguracion().subscribe();

    const peticiones = http.match((req) => req.url === '/api/v1/catalogos/configuracion');
    expect(peticiones.length).toBe(1);
    peticiones[0].flush({ peso_estandar_bulto_kg: 50, peso_estandar_canastilla_kg: 6 });
  });
});
