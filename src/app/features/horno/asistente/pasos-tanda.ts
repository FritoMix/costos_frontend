export type PasoTanda =
  | 'horario'
  | 'mezcla'
  | 'referencia_papa'
  | 'bultos'
  | 'temperatura'
  | 'personal_zona_humeda'
  | 'personal_seleccion'
  | 'aceite_inicial'
  | 'aceite_final'
  | 'desperdicio'
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
  resumen: {
    etiqueta: 'Confirmación',
    titulo: 'Revisa y guarda',
    sub: 'Verifica antes de registrar la tanda.',
  },
};

export function pasosDeTanda(conFormula: boolean): PasoTanda[] {
  return [
    'horario',
    ...(conFormula ? (['mezcla'] as const) : (['referencia_papa', 'bultos'] as const)),
    'temperatura',
    'personal_zona_humeda',
    'personal_seleccion',
    'aceite_inicial',
    'aceite_final',
    'desperdicio',
    'resumen',
  ];
}
