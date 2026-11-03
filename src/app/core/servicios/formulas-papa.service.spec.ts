import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { FormulaPapa, FormulaPapaGuardar } from '../modelos/formula-papa.model';
import { FormulasPapaService } from './formulas-papa.service';

describe('FormulasPapaService', () => {
  let servicio: FormulasPapaService;
  let http: HttpTestingController;

  const formula: FormulaPapa = {
    id: 3,
    nombre: 'Fórmula E2E',
    producto: { id: 7, nombre_comercial: 'Producto E2E' },
    activa: true,
    notas: null,
    referencias: [
      {
        referencia_id: 1,
        nombre: 'Papa E2E',
        tipo: 'Papa pareja',
        bultos_por_tanda: 40,
        porcentaje_produccion_pct: 100,
        peso_promedio_bulto_kg: 50,
        rendimiento_fritura_pct: 25,
        kg_crudos_por_tanda: 2000,
        kg_fritos_por_tanda: 500,
      },
    ],
    total_bultos_por_tanda: 40,
    total_kg_crudos: 2000,
    total_kg_fritos_estimados: 500,
    horas: null,
    total_bultos_planificados: null,
    total_kg_crudos_planificados: null,
    total_kg_fritos_planificados: null,
    creado_por: null,
    fecha_creacion: '2026-11-03T00:00:00Z',
    fecha_actualizacion: '2026-11-03T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(FormulasPapaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista fórmulas con los filtros informados', () => {
    servicio.listar({ productoId: 7, soloActivas: true }).subscribe((datos) => {
      expect(datos).toEqual([formula]);
    });

    const peticion = http.expectOne((req) => req.url.endsWith('/bodega/formulas-papa'));
    expect(peticion.request.params.get('producto_id')).toBe('7');
    expect(peticion.request.params.get('solo_activas')).toBe('true');
    peticion.flush([formula]);
  });

  it('consulta la fórmula activa con las horas para los totales', () => {
    servicio.activa(7, 2).subscribe((datos) => expect(datos).toEqual(formula));

    const peticion = http.expectOne((req) => req.url.endsWith('/bodega/formulas-papa/activa'));
    expect(peticion.request.params.get('producto_id')).toBe('7');
    expect(peticion.request.params.get('horas')).toBe('2');
    peticion.flush(formula);
  });

  it('crea, activa y elimina fórmulas', () => {
    const datos: FormulaPapaGuardar = {
      nombre: 'Fórmula E2E',
      producto_id: 7,
      referencias: [{ referencia_papa_id: 1, bultos_por_tanda: 40 }],
      notas: null,
    };

    servicio.crear(datos).subscribe();
    const crear = http.expectOne((req) => req.url.endsWith('/bodega/formulas-papa'));
    expect(crear.request.method).toBe('POST');
    expect(crear.request.body).toEqual(datos);
    crear.flush(formula);

    servicio.activar(3).subscribe();
    const activar = http.expectOne('/api/v1/bodega/formulas-papa/3/activar');
    expect(activar.request.method).toBe('POST');
    activar.flush(formula);

    servicio.desactivar(3).subscribe();
    http.expectOne('/api/v1/bodega/formulas-papa/3/desactivar').flush(formula);

    servicio.eliminar(3).subscribe();
    const eliminar = http.expectOne('/api/v1/bodega/formulas-papa/3');
    expect(eliminar.request.method).toBe('DELETE');
    eliminar.flush(null);
  });
});
