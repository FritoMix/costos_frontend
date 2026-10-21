/**
 * Calculos de vista previa para el operario.
 *
 * Son solo una ayuda visual: la API calcula y congela los valores
 * definitivos con Decimal. No se usan para guardar ni para reportes.
 */

export function redondear2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function calcularKgCrudosPreview(bultos: number, pesoBultoKg: number): number {
  if (!Number.isFinite(bultos) || !Number.isFinite(pesoBultoKg)) return 0;
  if (bultos < 0 || pesoBultoKg <= 0) return 0;
  return redondear2(bultos * pesoBultoKg);
}

export function calcularKgFritosPreview(
  kgCrudos: number,
  rendimientoPct: number | null | undefined,
): number {
  if (!Number.isFinite(kgCrudos) || rendimientoPct == null) return 0;
  if (kgCrudos < 0 || rendimientoPct <= 0 || rendimientoPct > 100) return 0;
  return redondear2((kgCrudos * rendimientoPct) / 100);
}

export function sumarParticipacion(
  referencias: { activo: boolean; porcentaje_produccion_pct: number | null }[],
): number {
  return redondear2(
    referencias
      .filter((r) => r.activo && r.porcentaje_produccion_pct != null)
      .reduce((total, r) => total + Number(r.porcentaje_produccion_pct), 0),
  );
}
