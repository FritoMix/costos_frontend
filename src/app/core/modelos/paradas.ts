/** Causas de parada dentro de la hora (mismas que acepta la API, V17). */
export type CausaParada =
  | 'falta_papa'
  | 'dano_mecanico'
  | 'limpieza'
  | 'aceite'
  | 'falta_personal'
  | 'gas_energia'
  | 'otro';

export const CAUSAS_PARADA: { valor: CausaParada; nombre: string }[] = [
  { valor: 'falta_papa', nombre: 'Falta de papa' },
  { valor: 'dano_mecanico', nombre: 'Daño mecánico' },
  { valor: 'limpieza', nombre: 'Limpieza' },
  { valor: 'aceite', nombre: 'Cambio o falta de aceite' },
  { valor: 'falta_personal', nombre: 'Falta de personal' },
  { valor: 'gas_energia', nombre: 'Gas o energía' },
  { valor: 'otro', nombre: 'Otra causa' },
];

/** Minutos de un toque; para otro valor queda el teclado. */
export const MINUTOS_PARADA = [10, 15, 20, 30, 45, 60];

export function nombreCausa(causa: string | null | undefined): string {
  return CAUSAS_PARADA.find((c) => c.valor === causa)?.nombre ?? 'Sin causa';
}

/** "Parada 20 min · Falta de papa", o null si no hubo parada. */
export function textoParada(registro: {
  minutos_parada?: number | null;
  causa_parada?: string | null;
  nota_parada?: string | null;
}): string | null {
  if (!registro.minutos_parada) return null;
  const causa =
    registro.causa_parada === 'otro' && registro.nota_parada
      ? registro.nota_parada
      : nombreCausa(registro.causa_parada);
  return `Parada ${registro.minutos_parada} min · ${causa}`;
}
