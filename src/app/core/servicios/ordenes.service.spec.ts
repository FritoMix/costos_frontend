import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type {
  OrdenGuardar,
  RecepcionGuardar,
  RegistroHornoGuardar,
} from '../modelos/produccion.model';
import { OrdenesService } from './ordenes.service';

describe('OrdenesService', () => {
  let servicio: OrdenesService;
  let http: HttpTestingController;

  const orden: OrdenGuardar = {
    turno_id: 1,
    horno_id: 2,
    categoria_id: 3,
    producto_id: 4,
    destino: 'nacional',
    unidad_solicitada: 'kg',
    cantidad_kg: 250,
    cantidad_canastillas: null,
    horas_produccion: 2,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(OrdenesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista todas las órdenes sin parámetros', () => {
    servicio.listar().subscribe((respuesta) => expect(respuesta).toEqual([]));

    const peticion = http.expectOne('/api/v1/ordenes');
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.params.keys()).toEqual([]);
    peticion.flush([]);
  });

  it('envía filtro de estado y solo_propias', () => {
    servicio.listar({ estado: 'en_produccion', soloPropias: false }).subscribe();

    const peticion = http.expectOne((req) => req.url === '/api/v1/ordenes' && req.method === 'GET');
    expect(peticion.request.params.get('estado')).toBe('en_produccion');
    expect(peticion.request.params.get('solo_propias')).toBe('false');
    peticion.flush([]);
  });

  it('consulta el detalle por id', () => {
    servicio.detalle(42).subscribe();

    const peticion = http.expectOne('/api/v1/ordenes/42');
    expect(peticion.request.method).toBe('GET');
    peticion.flush({});
  });

  it('crea y actualiza una orden', () => {
    servicio.crear(orden).subscribe();
    const crear = http.expectOne('/api/v1/ordenes');
    expect(crear.request.method).toBe('POST');
    expect(crear.request.body).toEqual(orden);
    crear.flush({});

    servicio.actualizar(42, orden).subscribe();
    const actualizar = http.expectOne('/api/v1/ordenes/42');
    expect(actualizar.request.method).toBe('PUT');
    expect(actualizar.request.body).toEqual(orden);
    actualizar.flush({});
  });

  it('cambia el estado con los endpoints de acción', () => {
    for (const accion of ['iniciar', 'finalizar', 'cancelar'] as const) {
      servicio[accion](42).subscribe();
      const peticion = http.expectOne(`/api/v1/ordenes/42/${accion}`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual({});
      peticion.flush({});
    }
  });

  it('elimina una orden y devuelve los registros arrastrados', () => {
    let arrastrados = 0;
    servicio.eliminar(42).subscribe((respuesta) => (arrastrados = respuesta.registros_eliminados));

    const peticion = http.expectOne('/api/v1/ordenes/42');
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush({ registros_eliminados: 3 });

    expect(arrastrados).toBe(3);
  });

  it('crea y corrige registros de horno', () => {
    const datos: RegistroHornoGuardar = {
      hora_inicio: '06:00',
      hora_fin: '07:00',
      cantidad_bultos: 40,
      operarios_seleccion: 5,
      operarios_horno: 5,
      nivel_aceite_inicial_cm: 50,
      nivel_aceite_final_cm: 45,
      temperatura_aceite_c: 180,
      observaciones: null,
      tipo_desperdicio_id: null,
      cantidad_desperdicio_kg: null,
      observacion_desperdicio: null,
    };

    servicio.crearRegistroHorno(42, datos).subscribe();
    const crear = http.expectOne('/api/v1/ordenes/42/registros-horno');
    expect(crear.request.method).toBe('POST');
    expect(crear.request.body).toEqual(datos);
    crear.flush({});

    servicio.actualizarRegistroHorno(42, 7, datos).subscribe();
    const editar = http.expectOne('/api/v1/ordenes/42/registros-horno/7');
    expect(editar.request.method).toBe('PUT');
    editar.flush({});

    servicio.eliminarRegistroHorno(42, 7).subscribe();
    const borrar = http.expectOne('/api/v1/ordenes/42/registros-horno/7');
    expect(borrar.request.method).toBe('DELETE');
    borrar.flush(null);
  });

  it('crea y corrige recepciones de saborizado', () => {
    const datos: RecepcionGuardar = {
      hora_inicio: '08:00',
      hora_fin: '08:30',
      sabor_id: 1,
      cantidad_sabor_kg: 2,
      pesos_canastillas: [20, 21.5],
    };

    servicio.crearRecepcion(42, datos).subscribe();
    const crear = http.expectOne('/api/v1/ordenes/42/recepciones');
    expect(crear.request.method).toBe('POST');
    expect(crear.request.body).toEqual(datos);
    crear.flush({});

    servicio.actualizarRecepcion(42, 9, datos).subscribe();
    const editar = http.expectOne('/api/v1/ordenes/42/recepciones/9');
    expect(editar.request.method).toBe('PUT');
    editar.flush({});

    servicio.eliminarRecepcion(42, 9).subscribe();
    const borrar = http.expectOne('/api/v1/ordenes/42/recepciones/9');
    expect(borrar.request.method).toBe('DELETE');
    borrar.flush(null);
  });
});
