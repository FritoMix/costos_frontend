import { TestBed } from '@angular/core/testing';

import { PasoMezclaHornoComponent } from './paso-mezcla.component';
import { PasoResumenHornoComponent } from './paso-resumen.component';
import { barraCapacidad, cambiarBultosMezcla, resumirMezcla } from './proyeccion-mezcla';
import type { DatosTandaHorno, FilaMezclaTanda } from './reglas-tanda';

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
  referenciaPapaId: 7,
  mezcla: [fila()],
  bultos: '2',
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

describe('Proyecciones de mezcla: conservar cálculos de vista', () => {
  it('suma varias referencias usando sus pesos y rendimientos congelados', () => {
    const filas = [
      fila(),
      fila({
        referencia_id: 8,
        bultos: 2,
        peso_promedio_bulto_kg: 40,
        rendimiento_fritura_pct: 30,
      }),
    ];
    expect(resumirMezcla(filas)).toEqual({ bultos: 12, kgCrudos: 580, kgFritos: 149 });
    expect(resumirMezcla([])).toEqual({ bultos: 0, kgCrudos: 0, kgFritos: 0 });
  });
  it('mantiene redondeo por fila y no inventa rendimiento si no está configurado', () => {
    expect(resumirMezcla([fila({ bultos: 1, peso_promedio_bulto_kg: 4.02 })]).kgFritos).toBe(1.01);
    expect(resumirMezcla([fila({ rendimiento_fritura_pct: null })])).toEqual({
      bultos: 10,
      kgCrudos: 500,
      kgFritos: 0,
    });
  });
  for (const [capacidad, total, porcentaje, clase] of [
    [null, 10, 0, 'bg-emerald-400'],
    [0, 10, 0, 'bg-emerald-400'],
    [50, 40, 80, 'bg-emerald-400'],
    [50, 45, 90, 'bg-amber-400'],
    [50, 50, 100, 'bg-amber-400'],
    [50, 51, 100, 'bg-rose-500'],
  ] as const) {
    it(`conserva la barra para ${total} bultos con capacidad ${capacidad}`, () => {
      expect(barraCapacidad(capacidad, total)).toEqual({ porcentaje, clase });
    });
  }
  it('acota los ajustes sin modificar la instantánea ni otras referencias', () => {
    const filas = Object.freeze([Object.freeze(fila()), Object.freeze(fila({ referencia_id: 8 }))]);
    expect(cambiarBultosMezcla(filas, 0, '100')[0].bultos).toBe(20);
    expect(cambiarBultosMezcla(filas, 0, '-1')[0].bultos).toBe(0);
    expect(cambiarBultosMezcla(filas, 0, 'no válido')[0].bultos).toBe(0);
    expect(cambiarBultosMezcla(filas, 0, null)[0].bultos).toBe(0);
    expect(cambiarBultosMezcla(filas, 0, '2.5')[0].bultos).toBe(2.5);
    expect(cambiarBultosMezcla(filas, 0, 8)[1]).toBe(filas[1]);
    expect(cambiarBultosMezcla(filas, 99, 8)).toEqual(filas);
    expect(filas[0].bultos).toBe(10);
  });
});

describe('Paso de mezcla sin estado propio', () => {
  it('emite cambios de botones y entrada sin alterar las filas del coordinador', async () => {
    const fixture = TestBed.createComponent(PasoMezclaHornoComponent);
    const filas = [fila()];
    fixture.componentRef.setInput('filas', filas);
    fixture.componentRef.setInput('capacidad', 50);
    const cambios: { indice: number; bultos: number | string | null }[] = [];
    fixture.componentInstance.bultosCambiados.subscribe((cambio) => cambios.push(cambio));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const vista = fixture.nativeElement as HTMLElement;
    const botones = vista.querySelectorAll('button');
    botones[0].click();
    botones[1].click();
    expect(cambios).toEqual([
      { indice: 0, bultos: 9 },
      { indice: 0, bultos: 11 },
    ]);
    const entrada = vista.querySelector('input') as HTMLInputElement;
    entrada.value = '2.5';
    entrada.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(cambios.at(-1)).toEqual({ indice: 0, bultos: 2.5 });
    expect(filas[0].bultos).toBe(10);
    fixture.componentRef.setInput('filas', [fila({ bultos: 2.5 })]);
    fixture.detectChanges();
    expect(vista.querySelector('[data-testid="horno-total-tanda"]')?.textContent).toContain('2.5');
    fixture.destroy();
  });
  it('muestra advertencia de capacidad y bloquea los controles agotados', async () => {
    const fixture = TestBed.createComponent(PasoMezclaHornoComponent);
    fixture.componentRef.setInput('filas', [
      fila({ bultos: 0, restante: 0 }),
      fila({ referencia_id: 8 }),
    ]);
    fixture.componentRef.setInput('capacidad', 5);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const vista = fixture.nativeElement as HTMLElement;
    expect(vista.textContent).toContain('El horno admite máximo 5');
    expect((vista.querySelector('input') as HTMLInputElement).disabled).toBeTrue();
    expect((vista.querySelector('button') as HTMLButtonElement).disabled).toBeTrue();
    fixture.componentRef.setInput('completa', true);
    fixture.detectChanges();
    expect(vista.querySelector('[data-testid="horno-formula-completa"]')).not.toBeNull();
    expect(vista.querySelector('input')).toBeNull();
    fixture.destroy();
  });
});

describe('Resumen de tanda: fórmula e histórica', () => {
  it('muestra totales de la fórmula y se actualiza cuando el coordinador corrige bultos', () => {
    const fixture = TestBed.createComponent(PasoResumenHornoComponent);
    fixture.componentRef.setInput('datos', datos());
    fixture.componentRef.setInput('horaInicio', '23:30');
    fixture.componentRef.setInput('horaFin', '00:30');
    fixture.detectChanges();
    const vista = fixture.nativeElement as HTMLElement;
    expect(vista.textContent).toContain('23:30 → 00:30');
    expect(vista.textContent).toContain('Papa de prueba');
    expect(vista.textContent).toContain('500 kg');
    expect(vista.textContent).toContain('125 kg');
    expect(vista.textContent).toContain('Sin desperdicio');
    fixture.componentRef.setInput('datos', datos({ mezcla: [fila({ bultos: 2 })] }));
    fixture.detectChanges();
    expect(vista.textContent).toContain('100 kg');
    expect(vista.textContent).toContain('25 kg');
    fixture.destroy();
  });
  it('muestra la referencia histórica, rendimiento opcional y desperdicio sin usar la mezcla', () => {
    const fixture = TestBed.createComponent(PasoResumenHornoComponent);
    fixture.componentRef.setInput(
      'datos',
      datos({
        conFormula: false,
        hayDesperdicio: true,
        tipoDesperdicioId: 2,
        cantidadDesperdicio: '1.25',
      }),
    );
    fixture.componentRef.setInput('horaInicio', '06:00');
    fixture.componentRef.setInput('horaFin', '07:00');
    fixture.componentRef.setInput('nombreDesperdicio', 'Papa quemada');
    fixture.componentRef.setInput('referencia', {
      id: 7,
      nombre: 'Referencia antigua',
      tipo: null,
      peso_promedio_bulto_kg: 40,
      rendimiento_fritura_pct: null,
    });
    fixture.detectChanges();
    const vista = fixture.nativeElement as HTMLElement;
    expect(vista.textContent).toContain('Referencia antigua');
    expect(vista.textContent).toContain('80 kg');
    expect(vista.textContent).toContain('Papa quemada');
    expect(vista.textContent).toContain('1.25 kg');
    expect(vista.textContent).not.toContain('Mezcla de la fórmula');
    expect(vista.textContent).not.toContain('NaN');
    fixture.destroy();
  });
});
