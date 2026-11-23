import { pasosDeTanda } from './pasos-tanda';
import type { PasoTanda } from './pasos-tanda';
import { consumoAceiteCm, numeroDeTexto, pasoTandaValido } from './reglas-tanda';
import type { DatosTandaHorno, FilaMezclaTanda } from './reglas-tanda';
import { construirRegistroHorno } from './solicitud-tanda';

const fila = (cambios: Partial<FilaMezclaTanda> = {}): FilaMezclaTanda => ({
  referencia_id: 7,
  nombre: 'Papa de prueba',
  bultos_por_tanda: 10,
  producido: 0,
  restante: 20,
  peso_promedio_bulto_kg: 50,
  rendimiento_fritura_pct: 25,
  bultos: 10,
  ...cambios,
});
const datos = (cambios: Partial<DatosTandaHorno> = {}): DatosTandaHorno => ({
  conFormula: true,
  referenciaPapaId: 99,
  mezcla: [fila()],
  bultos: '40',
  temperatura: '175',
  operariosSeleccion: 4,
  operariosZonaHumeda: 3,
  aceiteInicial: '50',
  aceiteFinal: '45',
  hayDesperdicio: false,
  tipoDesperdicioId: null,
  cantidadDesperdicio: '0',
  ...cambios,
});

describe('Reglas del asistente de horno: comportamiento existente', () => {
  it('conserva los dos recorridos con el orden de planta: temperatura primero, parada y bultos al final', () => {
    const comunes = [
      'horario',
      'temperatura',
      'personal_zona_humeda',
      'personal_seleccion',
      'aceite_inicial',
      'aceite_final',
      'desperdicio',
      'parada',
    ];
    expect(pasosDeTanda(true)).toEqual([...comunes, 'mezcla', 'resumen'] as never);
    expect(pasosDeTanda(false)).toEqual([
      ...comunes,
      'referencia_papa',
      'bultos',
      'resumen',
    ] as never);
  });

  it('exige contestar la parada y, si hubo, minutos y causa', () => {
    expect(pasoTandaValido('parada', datos({ hayParada: null }), 50)).toBeFalse();
    expect(pasoTandaValido('parada', datos({ hayParada: false }), 50)).toBeTrue();
    expect(
      pasoTandaValido('parada', datos({ hayParada: true, minutosParada: 20 }), 50),
    ).toBeFalse();
    expect(
      pasoTandaValido(
        'parada',
        datos({ hayParada: true, minutosParada: 20, causaParada: 'limpieza' }),
        50,
      ),
    ).toBeTrue();
    expect(
      pasoTandaValido(
        'parada',
        datos({ hayParada: true, minutosParada: 20, causaParada: 'otro' }),
        50,
      ),
    ).toBeFalse();
  });

  it('envía el número de tanda y la parada a la API', () => {
    const cuerpo = construirRegistroHorno(
      datos({ hayParada: true, minutosParada: 15, causaParada: 'falta_papa' }),
      { inicio: '07:00', fin: '08:00' },
      2,
    );
    expect(cuerpo.numero_tanda).toBe(2);
    expect(cuerpo.minutos_parada).toBe(15);
    expect(cuerpo.causa_parada).toBe('falta_papa');
    const sinParada = construirRegistroHorno(datos({ hayParada: false, minutosParada: 15 }), {
      inicio: '07:00',
      fin: '08:00',
    });
    expect(sinParada.minutos_parada).toBe(0);
    expect(sinParada.causa_parada).toBeNull();
  });

  const casos: {
    nombre: string;
    paso: PasoTanda;
    cambios: Partial<DatosTandaHorno>;
    valido: boolean;
  }[] = [
    { nombre: 'mezcla dentro del restante y capacidad', paso: 'mezcla', cambios: {}, valido: true },
    { nombre: 'mezcla vacía', paso: 'mezcla', cambios: { mezcla: [] }, valido: false },
    {
      nombre: 'restante excedido',
      paso: 'mezcla',
      cambios: { mezcla: [fila({ restante: 9 })] },
      valido: false,
    },
    {
      nombre: 'bultos negativos en una fila',
      paso: 'mezcla',
      cambios: { mezcla: [fila(), fila({ bultos: -1 })] },
      valido: false,
    },
    {
      nombre: 'referencia sin elegir',
      paso: 'referencia_papa',
      cambios: { referenciaPapaId: null },
      valido: false,
    },
    { nombre: 'referencia elegida', paso: 'referencia_papa', cambios: {}, valido: true },
    { nombre: 'cero bultos', paso: 'bultos', cambios: { bultos: '0' }, valido: false },
    { nombre: 'bultos históricos positivos', paso: 'bultos', cambios: {}, valido: true },
    {
      nombre: 'temperatura sin elegir',
      paso: 'temperatura',
      cambios: { temperatura: '0' },
      valido: false,
    },
    { nombre: 'temperatura elegida', paso: 'temperatura', cambios: {}, valido: true },
    {
      nombre: 'zona húmeda sin elegir',
      paso: 'personal_zona_humeda',
      cambios: { operariosZonaHumeda: 0 },
      valido: false,
    },
    { nombre: 'personal elegido', paso: 'personal_seleccion', cambios: {}, valido: true },
    {
      nombre: 'selección sin elegir',
      paso: 'personal_seleccion',
      cambios: { operariosSeleccion: 0 },
      valido: false,
    },
    {
      nombre: 'aceite inicial cero',
      paso: 'aceite_inicial',
      cambios: { aceiteInicial: '0' },
      valido: false,
    },
    {
      nombre: 'aceite final mayor al inicial',
      paso: 'aceite_final',
      cambios: { aceiteFinal: '51' },
      valido: false,
    },
    {
      nombre: 'nivel que sube con litros agregados',
      paso: 'aceite_final',
      cambios: { aceiteFinal: '51', aceiteAgregado: '40' },
      valido: true,
    },
    {
      nombre: 'aceite final igual al inicial',
      paso: 'aceite_final',
      cambios: { aceiteFinal: '50' },
      valido: true,
    },
    {
      nombre: 'aceite final negativo',
      paso: 'aceite_final',
      cambios: { aceiteFinal: '-1' },
      valido: false,
    },
    { nombre: 'sin desperdicio', paso: 'desperdicio', cambios: {}, valido: true },
    {
      nombre: 'desperdicio incompleto',
      paso: 'desperdicio',
      cambios: { hayDesperdicio: true },
      valido: false,
    },
    {
      nombre: 'desperdicio completo',
      paso: 'desperdicio',
      cambios: { hayDesperdicio: true, tipoDesperdicioId: 2, cantidadDesperdicio: '1.25' },
      valido: true,
    },
  ];
  for (const caso of casos) {
    it(caso.nombre, () =>
      expect(pasoTandaValido(caso.paso, datos(caso.cambios), 50)).toBe(caso.valido),
    );
  }
  it('rechaza la suma que supera la capacidad aunque cada fila tenga restante', () => {
    expect(
      pasoTandaValido('mezcla', datos({ mezcla: [fila(), fila({ referencia_id: 8 })] }), 15),
    ).toBeFalse();
  });
  it('mantiene conversión numérica y redondeo de consumo sin acceso a Angular', () => {
    expect(numeroDeTexto('12.50')).toBe(12.5);
    expect(numeroDeTexto('')).toBe(0);
    expect(numeroDeTexto('Infinity')).toBe(0);
    expect(numeroDeTexto('invalido')).toBe(0);
    expect(consumoAceiteCm('20.10', '20.09')).toBe(0.01);
    expect(consumoAceiteCm('0', '0')).toBeNull();
    expect(consumoAceiteCm('20', '21')).toBe(-1);
  });
});

describe('Solicitud de una tanda de horno', () => {
  it('envía los litros de aceite agregados solo cuando hay', () => {
    const conAceite = construirRegistroHorno(datos({ aceiteFinal: '52', aceiteAgregado: '30' }), {
      inicio: '08:00',
      fin: '09:00',
    });
    expect(conAceite.aceite_agregado_litros).toBe(30);
    const sinAceite = construirRegistroHorno(datos(), { inicio: '08:00', fin: '09:00' });
    expect('aceite_agregado_litros' in sinAceite).toBeFalse();
  });

  it('serializa fórmula con varias referencias sin mutar el formulario ni enviar la cabecera histórica', () => {
    const entrada = datos({
      mezcla: [
        fila(),
        fila({ referencia_id: 8, bultos: 2.5 }),
        fila({ referencia_id: 9, bultos: 0 }),
      ],
    });
    const antes = JSON.stringify(entrada);
    const cuerpo = construirRegistroHorno(entrada, { inicio: '23:30', fin: '00:30' });
    expect(JSON.parse(JSON.stringify(cuerpo))).toEqual({
      numero_tanda: null,
      hora_inicio: '23:30',
      hora_fin: '00:30',
      minutos_parada: 0,
      causa_parada: null,
      nota_parada: null,
      referencias: [
        { referencia_papa_id: 7, cantidad_bultos: 10 },
        { referencia_papa_id: 8, cantidad_bultos: 2.5 },
      ],
      operarios_seleccion: 4,
      operarios_horno: 3,
      nivel_aceite_inicial_cm: 50,
      nivel_aceite_final_cm: 45,
      temperatura_aceite_c: 175,
      observaciones: null,
      tipo_desperdicio_id: null,
      cantidad_desperdicio_kg: null,
      observacion_desperdicio: null,
    });
    expect(JSON.stringify(entrada)).toBe(antes);
  });
  it('conserva el contrato de la tanda histórica con su referencia única', () => {
    const cuerpo = construirRegistroHorno(datos({ conFormula: false }), {
      inicio: '06:00',
      fin: '07:00',
    });
    expect(cuerpo.referencias).toEqual([]);
    expect(cuerpo.referencia_papa_id).toBe(99);
    expect(cuerpo.cantidad_bultos).toBe(40);
  });
  it('envía tipo y kg del desperdicio solo cuando están completos', () => {
    const cuerpo = construirRegistroHorno(
      datos({ hayDesperdicio: true, tipoDesperdicioId: 3, cantidadDesperdicio: '2.50' }),
      { inicio: '06:00', fin: '07:00' },
    );
    expect(cuerpo.tipo_desperdicio_id).toBe(3);
    expect(cuerpo.cantidad_desperdicio_kg).toBe(2.5);
    const sinCantidad = construirRegistroHorno(datos({ tipoDesperdicioId: 3 }), {
      inicio: '06:00',
      fin: '07:00',
    });
    expect(sinCantidad.tipo_desperdicio_id).toBeNull();
    expect(sinCantidad.cantidad_desperdicio_kg).toBeNull();
  });
});
