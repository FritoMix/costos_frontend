import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { FormulaProduccionPage } from './formula-produccion.page';

describe('Bandeja de fórmulas con cambios rápidos de filtros', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FormulaProduccionPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('cancela filtros antiguos y libera peticiones al salir', () => {
    const fixture = TestBed.createComponent(FormulaProduccionPage);
    http.expectOne((r) => r.url.endsWith('/catalogos/productos')).flush([]);
    http.expectOne((r) => r.url.endsWith('/bodega/formulas-papa')).flush([]);
    const inicial = http.expectOne((r) => r.url.endsWith('/bodega/ordenes'));
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector('[data-testid="seccion-ordenes"]') as HTMLButtonElement
    ).click();
    expect(inicial.cancelled).toBeTrue();
    const seccion = http.expectOne((r) => r.url.endsWith('/bodega/ordenes'));
    fixture.detectChanges();
    const chips = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    chips.find((b) => b.textContent?.trim() === 'En producción')!.click();
    expect(seccion.cancelled).toBeTrue();
    const final = http.expectOne((r) => r.url.endsWith('/bodega/ordenes'));
    expect(final.request.params.get('estado')).toBe('en_produccion');
    fixture.destroy();
    expect(final.cancelled).toBeTrue();
  });
  it('permite una sola activación de fórmula pendiente a la vez', () => {
    const fixture = TestBed.createComponent(FormulaProduccionPage);
    const fila = (id: number) => ({
      id,
      nombre: `Fórmula ${id}`,
      activa: false,
      producto: { nombre_comercial: 'Papa ficticia' },
      referencias: [],
      total_bultos_por_tanda: 10,
      total_kg_crudos: 500,
      total_kg_fritos_estimados: null,
    });
    http.expectOne((r) => r.url.endsWith('/catalogos/productos')).flush([]);
    http.expectOne((r) => r.url.endsWith('/bodega/ordenes')).flush([]);
    http.expectOne((r) => r.url.endsWith('/bodega/formulas-papa')).flush([fila(1), fila(2)]);
    fixture.detectChanges();
    const uno = fixture.nativeElement.querySelector(
      '[data-testid="formula-papa-activar-1"]',
    ) as HTMLButtonElement;
    const dos = fixture.nativeElement.querySelector(
      '[data-testid="formula-papa-activar-2"]',
    ) as HTMLButtonElement;
    uno.click();
    uno.click();
    dos.click();
    const inicio = http.expectOne('/api/v1/bodega/formulas-papa/1/activar');
    http.expectNone('/api/v1/bodega/formulas-papa/2/activar');
    fixture.detectChanges();
    expect(uno.disabled).toBeTrue();
    expect(dos.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
      'Procesando',
    );
    inicio.flush({ ...fila(1), activa: true });
    http
      .expectOne((r) => r.url.endsWith('/bodega/formulas-papa'))
      .flush([{ ...fila(1), activa: true }, fila(2)]);
    fixture.destroy();
  });
});
