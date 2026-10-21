import {
  calcularKgCrudosPreview,
  calcularKgFritosPreview,
  redondear2,
  sumarParticipacion,
} from './calculos-produccion';

describe('calculos de vista previa de produccion', () => {
  it('calcula kg crudos con el peso del bulto', () => {
    expect(calcularKgCrudosPreview(50, 50)).toBe(2500);
    expect(calcularKgCrudosPreview(33, 48.5)).toBe(1600.5);
  });

  it('calcula kg fritos con el rendimiento y redondea a centavos', () => {
    expect(calcularKgFritosPreview(2500, 25)).toBe(625);
    expect(calcularKgFritosPreview(4.02, 25)).toBe(1.01);
    expect(calcularKgFritosPreview(1650, 25)).toBe(412.5);
  });

  it('no inventa valores cuando faltan datos', () => {
    expect(calcularKgCrudosPreview(0, 50)).toBe(0);
    expect(calcularKgCrudosPreview(-1, 50)).toBe(0);
    expect(calcularKgFritosPreview(100, null)).toBe(0);
    expect(calcularKgFritosPreview(100, 0)).toBe(0);
    expect(calcularKgFritosPreview(100, 101)).toBe(0);
  });

  it('suma solo la participacion de referencias activas configuradas', () => {
    expect(
      sumarParticipacion([
        { activo: true, porcentaje_produccion_pct: 66.67 },
        { activo: true, porcentaje_produccion_pct: 33.33 },
        { activo: false, porcentaje_produccion_pct: 100 },
        { activo: true, porcentaje_produccion_pct: null },
      ]),
    ).toBe(100);
    expect(redondear2(33.335 + 66.665)).toBe(100);
  });
});
