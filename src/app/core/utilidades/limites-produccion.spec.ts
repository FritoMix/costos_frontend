import {
  duracionMinutos,
  formatearMinutos,
  minutosDisponibles,
  minutosRegistrados,
} from './limites-produccion';

describe('limites de produccion', () => {
  const tanda = {
    id: 1,
    hora_inicio: '2026-10-22T06:00:00-05:00',
    hora_fin: '2026-10-22T07:00:00-05:00',
  };

  it('calcula la duracion entre dos fechas ISO', () => {
    expect(duracionMinutos(tanda.hora_inicio, tanda.hora_fin)).toBe(60);
  });

  it('suma los registros y puede excluir el que se corrige', () => {
    expect(minutosRegistrados([tanda])).toBe(60);
    expect(minutosRegistrados([tanda], tanda.id)).toBe(0);
  });

  it('descuenta las horas ya registradas de las horas de la orden', () => {
    expect(minutosDisponibles(1, [tanda])).toBe(0);
    expect(minutosDisponibles(2, [tanda])).toBe(60);
  });

  it('no limita las ordenes historicas sin horas configuradas', () => {
    expect(minutosDisponibles(null, [tanda])).toBeNull();
    expect(minutosDisponibles(undefined, [tanda])).toBeNull();
  });

  it('formatea minutos para los avisos de planta', () => {
    expect(formatearMinutos(0)).toBe('0 min');
    expect(formatearMinutos(60)).toBe('1 hora');
    expect(formatearMinutos(90)).toBe('1 h 30 min');
    expect(formatearMinutos(120)).toBe('2 horas');
  });
});
