/** Colores existentes de los selectores numéricos; compartidos sin alterar la paleta. */
export function colorTecla(activo: boolean): string {
  return activo
    ? 'border-marca-500 bg-marca-600 text-white'
    : 'border-slate-200 bg-white text-slate-700 hover:border-marca-400 hover:bg-marca-50 hover:text-marca-800';
}
