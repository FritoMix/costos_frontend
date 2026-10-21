import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type {
  ProyeccionProduccion,
  ReferenciaPapa,
  ReferenciaPapaGuardar,
} from '../modelos/bodega.model';
import { BodegaService } from './bodega.service';

describe('BodegaService', () => {
  let servicio: BodegaService;
  let http: HttpTestingController;

  const referencia: ReferenciaPapa = {
    id: 1,
    nombre: 'Papa Pastusa',
    tipo: 'Papa pareja',
    peso_promedio_bulto_kg: 50,
    rendimiento_fritura_pct: 25,
    porcentaje_produccion_pct: 100,
    activo: true,
    fecha_creacion: '2026-10-21T00:00:00Z',
    fecha_actualizacion: '2026-10-21T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(BodegaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista referencias activas sin reutilizar la caché completa', () => {
    servicio.listar(true).subscribe((datos) => expect(datos).toEqual([referencia]));

    const peticion = http.expectOne((req) => req.url.endsWith('/bodega/referencias-papa'));
    expect(peticion.request.params.get('solo_activas')).toBe('true');
    peticion.flush([referencia]);
  });

  it('envía los parámetros productivos al crear una referencia', () => {
    const datos: ReferenciaPapaGuardar = {
      nombre: 'Papa Pastusa',
      tipo: 'Papa pareja',
      peso_promedio_bulto_kg: 50,
      rendimiento_fritura_pct: 25,
      porcentaje_produccion_pct: 100,
      activo: true,
    };

    servicio.crear(datos).subscribe((creada) => expect(creada).toEqual(referencia));

    const peticion = http.expectOne((req) => req.url.endsWith('/bodega/referencias-papa'));
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(datos);
    peticion.flush(referencia);
  });

  it('invalida la caché de referencias después de guardar', () => {
    let listado: ReferenciaPapa[] | undefined;
    servicio.listar().subscribe((datos) => (listado = datos));
    http.expectOne((req) => req.url.endsWith('/bodega/referencias-papa')).flush([referencia]);

    servicio
      .actualizar(referencia.id, {
        nombre: referencia.nombre,
        tipo: referencia.tipo!,
        peso_promedio_bulto_kg: referencia.peso_promedio_bulto_kg,
        rendimiento_fritura_pct: referencia.rendimiento_fritura_pct!,
        porcentaje_produccion_pct: referencia.porcentaje_produccion_pct!,
        activo: false,
      })
      .subscribe();
    http
      .expectOne((req) => req.url.endsWith(`/bodega/referencias-papa/${referencia.id}`))
      .flush({ ...referencia, activo: false });

    servicio.listar().subscribe((datos) => (listado = datos));
    http.expectOne((req) => req.url.endsWith('/bodega/referencias-papa')).flush([]);
    expect(listado).toEqual([]);
  });

  it('proyecta con el horno y las horas indicadas', () => {
    const proyeccion: ProyeccionProduccion = {
      horno_id: 2,
      horno_nombre: 'Horno 1',
      capacidad_bultos_hora: 50,
      horas: 2,
      total_bultos: 100,
      total_kg_crudos: 5000,
      total_kg_fritos_estimados: 1250,
      referencias: [],
    };

    servicio.proyectar(2, 2).subscribe((datos) => expect(datos).toEqual(proyeccion));

    const peticion = http.expectOne((req) => req.url.endsWith('/bodega/proyeccion'));
    expect(peticion.request.params.get('horno_id')).toBe('2');
    expect(peticion.request.params.get('horas')).toBe('2');
    peticion.flush(proyeccion);
  });
});
