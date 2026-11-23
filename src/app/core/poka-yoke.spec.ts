import {
  revisarBultos,
  revisarCanastillas,
  revisarCantidadOrden,
  revisarDesperdicio,
  revisarHoras,
  revisarKgMateriaPrima,
  revisarOperarios,
  revisarPesoCanastilla,
  revisarSabor,
  revisarTemperatura,
} from './poka-yoke';

describe('A prueba de errores (poka-yoke)', () => {
  it('canastillas: imposible fuera de 0,5 a 30 kg y raro fuera de 3 a 12 kg', () => {
    expect(revisarPesoCanastilla(0.2).error).toBeDefined();
    expect(revisarPesoCanastilla(60).error).toBeDefined();
    expect(revisarPesoCanastilla(6).error).toBeUndefined();
    expect(revisarCanastillas([6, 5.5]).error).toBeUndefined();
    expect(revisarCanastillas([6, 5.5]).aviso).toBeUndefined();
    expect(revisarCanastillas([6, 25]).aviso).toContain('25');
    expect(revisarCanastillas([6, 45]).error).toContain('45');
  });

  it('bultos: más de 100 o con decimales no deja seguir; pocos sin parada avisa', () => {
    expect(revisarBultos(500).error).toBeDefined();
    expect(revisarBultos(40.5).error).toContain('enteros');
    expect(revisarBultos(15).aviso).toBeDefined();
    expect(revisarBultos(15, true).aviso).toBeUndefined();
    expect(revisarBultos(40)).toEqual({});
  });

  it('temperatura, operarios, sabor y materia prima', () => {
    expect(revisarTemperatura(1800).error).toBeDefined();
    expect(revisarTemperatura(150).aviso).toBeDefined();
    expect(revisarTemperatura(180)).toEqual({});
    expect(revisarOperarios(40).error).toBeDefined();
    expect(revisarOperarios(20).aviso).toBeDefined();
    expect(revisarSabor(80).error).toBeDefined();
    expect(revisarSabor(25).aviso).toBeDefined();
    expect(revisarSabor(2)).toEqual({});
    expect(revisarKgMateriaPrima(25000).error).toBeDefined();
    expect(revisarKgMateriaPrima(400)).toEqual({});
  });

  it('desperdicio no puede superar la materia prima que entró', () => {
    expect(revisarDesperdicio(300, 200).error).toBeDefined();
    expect(revisarDesperdicio(30, 200).aviso).toBeDefined();
    expect(revisarDesperdicio(5, 200)).toEqual({});
  });

  it('orden: cantidades imposibles y horas de más', () => {
    expect(revisarCantidadOrden(50000, 'kg').error).toBeDefined();
    expect(revisarCantidadOrden(2.5, 'baches').error).toContain('enteros');
    expect(revisarCantidadOrden(3, 'mojes')).toEqual({});
    expect(revisarHoras(14).error).toBeDefined();
    expect(revisarHoras(10).aviso).toBeDefined();
    expect(revisarHoras(8)).toEqual({});
  });
});
