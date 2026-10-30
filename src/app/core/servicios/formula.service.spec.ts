import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type {
  Formula,
  FormulaGuardar,
  FormulaProyeccion,
  FormulaProyeccionGuardar,
} from '../modelos/formula.model';
import { FormulaService } from './formula.service';

describe('FormulaService', () => {
  let servicio: FormulaService;
  let http: HttpTestingController;

  const formula: Formula = {
    orden_id: 42,
    estado: 'lista',
    referencias: [
      {
        referencia_id: 1,
        nombre: 'Papa E2E',
        tipo: 'Papa pareja',
        bultos_por_tanda: 40,
        bultos_planificados: 40,
        porcentaje_produccion_pct: 100,
        peso_promedio_bulto_kg: 50,
        rendimiento_fritura_pct: 25,
        kg_crudos_por_tanda: 2000,
        kg_fritos_por_tanda: 500,
        kg_crudos_planificados: 2000,
        kg_fritos_estimados: 500,
        bultos_producidos: 0,
        bultos_restantes: 40,
      },
    ],
    notas: null,
    capacidad_bultos_hora: 50,
    capacidad_maxima_bultos: 50,
    total_bultos_por_tanda: 40,
    total_bultos_planificados: 40,
    total_kg_crudos: 2000,
    total_kg_fritos_estimados: 500,
    total_bultos_producidos: 0,
    avance_bultos_porcentaje: 0,
    tandas_registradas: 0,
    tandas_programadas: 1,
    actualizada_por: null,
    fecha_actualizacion: null,
    advertencias: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(FormulaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('obtiene la fórmula de la orden', () => {
    servicio.obtener(42).subscribe((datos) => expect(datos).toEqual(formula));

    const peticion = http.expectOne('/api/v1/ordenes/42/formula');
    expect(peticion.request.method).toBe('GET');
    peticion.flush(formula);
  });

  it('guarda la mezcla con sus notas', () => {
    const datos: FormulaGuardar = {
      referencias: [{ referencia_papa_id: 1, bultos_por_tanda: 40 }],
      notas: 'Mezcla de la semana',
    };

    servicio.guardar(42, datos).subscribe((guardada) => expect(guardada).toEqual(formula));

    const peticion = http.expectOne('/api/v1/ordenes/42/formula');
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual(datos);
    peticion.flush(formula);
  });

  it('proyecta la mezcla sin guardar nada', () => {
    const datos: FormulaProyeccionGuardar = {
      referencias: [{ referencia_papa_id: 1, bultos_por_tanda: 40 }],
      usar_sugerencia: false,
    };
    const proyeccion = {
      origen: 'manual',
      factible: true,
      total_bultos_por_tanda: 40,
    } as FormulaProyeccion;

    servicio.proyectar(42, datos).subscribe((salida) => expect(salida).toEqual(proyeccion));

    const peticion = http.expectOne('/api/v1/ordenes/42/formula/proyeccion');
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(datos);
    peticion.flush(proyeccion);
  });
});
