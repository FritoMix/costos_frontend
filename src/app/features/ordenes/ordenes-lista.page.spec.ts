import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { OrdenesListaPage } from './ordenes-lista.page';

describe('Listado paginado de órdenes', () => {
  const fila = {
    id: 1,
    numero_orden: 'OP-1',
    fecha: '2026-11-13',
    estado: 'pendiente',
    estado_etiqueta: 'Pendiente',
    producto: { nombre_comercial: 'Papa' },
    categoria: { nombre: 'Papa' },
    horno: { nombre: 'Horno 1' },
    cantidad_programada: 100,
    formula_obligatoria: false,
    unidad_solicitada: 'kg',
    destino: 'nacional',
  };
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrdenesListaPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('navega a la siguiente página y muestra el total', () => {
    const fixture = TestBed.createComponent(OrdenesListaPage);
    const primera = http.expectOne((r) => r.url === '/api/v1/ordenes/pagina');
    expect(primera.request.params.get('pagina')).toBe('1');
    primera.flush({ items: [fila], total: 120, pagina: 1, tamano: 50 });
    fixture.detectChanges();
    const siguiente = fixture.nativeElement.querySelector(
      '[aria-label="Página siguiente"]',
    ) as HTMLButtonElement;
    siguiente.click();
    const segunda = http.expectOne((r) => r.url === '/api/v1/ordenes/pagina');
    expect(segunda.request.params.get('pagina')).toBe('2');
    segunda.flush({ items: [fila], total: 120, pagina: 2, tamano: 50 });
    fixture.destroy();
  });

  it('cancela la petición anterior al cambiar de filtro', () => {
    const fixture = TestBed.createComponent(OrdenesListaPage);
    const primera = http.expectOne((r) => r.url === '/api/v1/ordenes/pagina');
    fixture.detectChanges();
    const botones = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    botones.find((b) => b.textContent?.trim() === 'Pendientes')!.click();
    expect(primera.cancelled).toBeTrue();
    const filtrada = http.expectOne((r) => r.url === '/api/v1/ordenes/pagina');
    expect(filtrada.request.params.get('estado')).toBe('pendiente');
    expect(filtrada.request.params.get('pagina')).toBe('1');
    filtrada.flush({ items: [], total: 0, pagina: 1, tamano: 50 });
    fixture.destroy();
  });

  it('muestra reintento tras un fallo sin confundirlo con un listado vacío', () => {
    const fixture = TestBed.createComponent(OrdenesListaPage);
    http
      .expectOne((r) => r.url === '/api/v1/ordenes/pagina')
      .flush({}, { status: 503, statusText: 'Ocupado' });
    fixture.detectChanges();
    const alerta = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alerta.textContent).toContain('No se pudo cargar');
    alerta.querySelector('button').click();
    http
      .expectOne((r) => r.url === '/api/v1/ordenes/pagina')
      .flush({ items: [], total: 0, pagina: 1, tamano: 50 });
    fixture.destroy();
  });
});
