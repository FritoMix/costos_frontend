export type PasoTanda =
  | 'horario'
  | 'mezcla'
  | 'referencia_papa'
  | 'bultos'
  | 'kg_materia'
  | 'temperatura'
  | 'personal_zona_humeda'
  | 'personal_seleccion'
  | 'aceite_inicial'
  | 'aceite_final'
  | 'desperdicio'
  | 'parada'
  | 'resumen';

export const TEXTOS_PASOS_HORNO: Record<
  PasoTanda,
  { etiqueta: string; titulo: string; sub: string }
> = {
  horario: {
    etiqueta: 'Horario',
    titulo: 'Esta es la hora de tu tanda',
    sub: 'Se toma automáticamente. Cada tanda dura una hora.',
  },
  mezcla: {
    etiqueta: 'Materia prima',
    titulo: '¿Cuántos bultos de cada papa entraron?',
    sub: 'La mezcla la definió Bodega. Ajusta los bultos dentro del restante de cada referencia.',
  },
  referencia_papa: {
    etiqueta: 'Materia prima',
    titulo: '¿Qué papa entró al horno?',
    sub: 'Elige la referencia que despachó Bodega para esta tanda.',
  },
  bultos: {
    etiqueta: 'Materia prima',
    titulo: '¿Cuántos bultos entraron?',
    sub: 'Papa cruda que alimentó el horno.',
  },
  kg_materia: {
    etiqueta: 'Materia prima',
    titulo: '¿Cuántos kilos entraron al horno?',
    sub: 'Kilos de materia prima cruda que alimentaron el horno en esta hora.',
  },
  temperatura: { etiqueta: 'Proceso', titulo: '¿A qué temperatura está el aceite?', sub: '' },
  personal_zona_humeda: {
    etiqueta: 'Personal',
    titulo: '¿Cuántos operarios en zona húmeda?',
    sub: 'Toca el número de personas que trabajaron en el área.',
  },
  personal_seleccion: {
    etiqueta: 'Personal',
    titulo: '¿Cuántos operarios en selección?',
    sub: 'Personas seleccionando la papa ya freída.',
  },
  aceite_inicial: {
    etiqueta: 'Aceite',
    titulo: '¿Nivel inicial del aceite?',
    sub: 'Medida en centímetros antes de la tanda.',
  },
  aceite_final: {
    etiqueta: 'Aceite',
    titulo: '¿Nivel final del aceite?',
    sub: 'Medida en centímetros al terminar.',
  },
  desperdicio: { etiqueta: 'Desperdicio', titulo: '¿Hubo desperdicio?', sub: '' },
  parada: {
    etiqueta: 'Parada',
    titulo: '¿El horno estuvo parado en esta hora?',
    sub: 'Si paró, di cuántos minutos y por qué. Explica por qué salieron menos bultos.',
  },
  resumen: {
    etiqueta: 'Confirmación',
    titulo: 'Revisa y guarda',
    sub: 'Verifica antes de registrar la tanda.',
  },
};

/**
 * Orden en que se toman los datos en planta: primero la temperatura y, al
 * final de la hora, la parada y los bultos que entraron (V17).
 */
export function pasosDeTanda(conFormula: boolean, enKg = false): PasoTanda[] {
  // Plátano, pellet...: kilos de materia prima, sin papa ni bultos (V21).
  const materia: PasoTanda[] = enKg
    ? ['kg_materia']
    : conFormula
      ? ['mezcla']
      : ['referencia_papa', 'bultos'];
  return [
    'horario',
    'temperatura',
    'personal_zona_humeda',
    'personal_seleccion',
    'aceite_inicial',
    'aceite_final',
    'desperdicio',
    'parada',
    ...materia,
    'resumen',
  ];
}
