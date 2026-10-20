import { TestBed } from '@angular/core/testing';

import { IndicadorComponent } from './indicador.component';

describe('IndicadorComponent', () => {
  function crear(inputs: Record<string, unknown>): HTMLElement {
    const fixture = TestBed.createComponent(IndicadorComponent);
    for (const [clave, valor] of Object.entries(inputs)) {
      fixture.componentRef.setInput(clave, valor);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [IndicadorComponent] });
  });

  it('muestra nombre, valor formateado y unidad', () => {
    const elemento = crear({
      nombre: 'Kg procesados',
      valor: 1234.5,
      unidad: 'kg',
    });

    expect(elemento.textContent).toContain('Kg procesados');
    expect(elemento.textContent).toContain('1,234.5');
    expect(elemento.textContent).toContain('kg');
  });

  it('muestra un guion y el dato faltante cuando no hay valor', () => {
    const elemento = crear({
      nombre: 'Rendimiento',
      valor: null,
      faltante: 'Sin datos del período',
    });

    expect(elemento.textContent).toContain('—');
    expect(elemento.textContent).toContain('Sin datos del período');
  });

  it('renderiza el subtexto cuando se informa', () => {
    const elemento = crear({
      nombre: 'Absorción de aceite',
      valor: 2.25,
      subtexto: 'Promedio de las últimas 24 horas',
    });

    expect(elemento.textContent).toContain('2.25');
    expect(elemento.textContent).toContain('Promedio de las últimas 24 horas');
  });
});
