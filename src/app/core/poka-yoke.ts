/**
 * Controles "a prueba de errores" (poka-yoke) de los asistentes de planta.
 *
 * Dos niveles:
 *  - error: el dato no puede ser (ej. 500 bultos en una hora). No deja
 *    seguir hasta corregirlo.
 *  - aviso: el dato es raro pero puede pasar (ej. 15 bultos). Deja seguir
 *    solo si la persona confirma «Sí, el dato está bien».
 *
 * Los rangos normales vienen de la planta: una tanda lleva 30 a 55 bultos,
 * el aceite trabaja entre 160 y 195 °C y una canastilla pesa unos 6 kg.
 * La API conserva la autoridad: estos controles evitan el error antes de
 * enviar, en la tableta.
 */

export interface Revision {
  error?: string;
  aviso?: string;
}

export const LIMITES = {
  bultosMax: 100,
  bultosNormal: [25, 60] as const,
  // Plátano, pellet...: kilos de materia prima en una hora (igual que el backend).
  kgMateriaPrimaMax: 20000,
  kgMateriaPrimaRaro: 5000,
  temperatura: [120, 220] as const,
  temperaturaNormal: [160, 195] as const,
  aceiteCmMax: 150,
  bajaAceiteCmRara: 20,
  operariosMax: 30,
  operariosRaro: 15,
  // Una canastilla pesa unos 6 kg: menos de 0,5 o más de 30 no es posible (igual que la API).
  canastillaKg: [0.5, 30] as const,
  canastillaNormal: [3, 12] as const,
  saborKgMax: 50,
  saborKgRaro: 20,
  ordenKgMax: 20000,
  ordenCanastillasMax: 3000,
  ordenUnidadesMax: 100,
  horasMax: 12,
};

const n = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 2 });

export function revisarBultos(bultos: number, huboParada = false): Revision {
  if (bultos > LIMITES.bultosMax) {
    return {
      error: `${n(bultos)} bultos en una hora no es posible. Revisa el número (máximo ${LIMITES.bultosMax}).`,
    };
  }
  if (!Number.isInteger(bultos) && bultos > 0) {
    return { error: 'Los bultos van enteros (sin decimales).' };
  }
  const [min, max] = LIMITES.bultosNormal;
  if (bultos > 0 && bultos < min && !huboParada) {
    return {
      aviso: `Son pocos bultos para una hora (lo normal es ${min} a ${max}). Si el horno paró, regresa al paso de parada y anótalo.`,
    };
  }
  if (bultos > max) {
    return { aviso: `Son muchos bultos para una hora (lo normal es ${min} a ${max}).` };
  }
  return {};
}

export function revisarTemperatura(c: number): Revision {
  const [min, max] = LIMITES.temperatura;
  if (c > 0 && (c < min || c > max)) {
    return { error: `${n(c)} °C no es una temperatura posible del aceite. Revisa el termómetro.` };
  }
  const [nmin, nmax] = LIMITES.temperaturaNormal;
  if (c > 0 && (c < nmin || c > nmax)) {
    return { aviso: `La temperatura normal es de ${nmin} a ${nmax} °C. ¿Leíste bien el termómetro?` };
  }
  return {};
}

export function revisarNivelAceite(cm: number): Revision {
  if (cm > LIMITES.aceiteCmMax) {
    return { error: `${n(cm)} cm es más de lo que mide el tanque. El nivel va en centímetros.` };
  }
  return {};
}

export function revisarBajaAceite(bajaCm: number | null): Revision {
  if (bajaCm !== null && bajaCm > LIMITES.bajaAceiteCmRara) {
    return {
      aviso: `El aceite bajó ${n(bajaCm)} cm en una hora, más de lo normal. ¿Están bien los dos niveles?`,
    };
  }
  return {};
}

export function revisarOperarios(cantidad: number): Revision {
  if (cantidad > LIMITES.operariosMax) return { error: `${cantidad} personas no es posible en esta zona.` };
  if (cantidad > LIMITES.operariosRaro) return { aviso: `${cantidad} personas es más de lo normal. ¿Está bien?` };
  return {};
}

/** Plátano, pellet y demás líneas: kilos de materia prima en una hora. */
export function revisarKgMateriaPrima(kg: number): Revision {
  if (kg > LIMITES.kgMateriaPrimaMax) {
    return {
      error: `${n(kg)} kg en una hora no es posible. Revisa el número (máximo ${n(LIMITES.kgMateriaPrimaMax)}).`,
    };
  }
  if (kg > LIMITES.kgMateriaPrimaRaro) {
    return { aviso: `${n(kg)} kg en una hora es más de lo normal. ¿Está bien el peso?` };
  }
  return {};
}

export function revisarDesperdicio(kg: number, kgCrudos: number): Revision {
  if (kgCrudos > 0 && kg > kgCrudos) {
    return {
      error: `El desperdicio (${n(kg)} kg) no puede ser más que la materia prima que entró (${n(kgCrudos)} kg).`,
    };
  }
  if (kgCrudos > 0 && kg > kgCrudos * 0.1) {
    return { aviso: 'Es más del 10 % de la materia prima que entró. ¿Está bien el peso?' };
  }
  return {};
}

/** Una sola canastilla, antes de agregarla a la lista. */
export function revisarPesoCanastilla(peso: number): Revision {
  const [min, max] = LIMITES.canastillaKg;
  if (peso > 0 && (peso < min || peso > max)) {
    return {
      error: `Una canastilla de ${n(peso)} kg no es posible (debe estar entre ${n(min)} y ${n(max)} kg). Revisa la báscula.`,
    };
  }
  return {};
}

export function revisarCanastillas(pesos: number[]): Revision {
  const [min, max] = LIMITES.canastillaKg;
  const imposible = pesos.find((p) => p < min || p > max);
  if (imposible !== undefined) {
    return { error: `Una canastilla de ${n(imposible)} kg no es posible. Bórrala y pésala otra vez.` };
  }
  const [nmin, nmax] = LIMITES.canastillaNormal;
  const rara = pesos.find((p) => p < nmin || p > nmax);
  if (rara !== undefined) {
    return { aviso: `Una canastilla pesa ${n(rara)} kg y lo normal es ${nmin} a ${nmax} kg. ¿Está bien?` };
  }
  return {};
}

export function revisarSabor(kg: number): Revision {
  if (kg > LIMITES.saborKgMax) return { error: `${n(kg)} kg de sabor no es posible en una hora. Revisa el número.` };
  if (kg > LIMITES.saborKgRaro) return { aviso: `${n(kg)} kg de sabor es más de lo normal. ¿Está bien?` };
  return {};
}

export function revisarCantidadOrden(cantidad: number, unidad: string | null): Revision {
  if (unidad && ['mojes', 'baches', 'bultos'].includes(unidad)) {
    if (!Number.isInteger(cantidad)) return { error: `Los ${unidad} van enteros (sin decimales).` };
    if (cantidad > LIMITES.ordenUnidadesMax) {
      return { error: `${n(cantidad)} ${unidad} es demasiado para una orden. Revisa el número.` };
    }
    return {};
  }
  if (unidad === 'kg' && cantidad > LIMITES.ordenKgMax) {
    return { error: `${n(cantidad)} kg es demasiado para una orden. Revisa el número.` };
  }
  if (unidad === 'canastillas' && cantidad > LIMITES.ordenCanastillasMax) {
    return { error: `${n(cantidad)} canastillas es demasiado para una orden. Revisa el número.` };
  }
  return {};
}

export function revisarHoras(horas: number): Revision {
  if (horas > LIMITES.horasMax) return { error: `Una orden puede durar máximo ${LIMITES.horasMax} horas.` };
  if (horas > 8) return { aviso: `${horas} horas es más que un turno. ¿Está bien?` };
  return {};
}
