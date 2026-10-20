import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { TecladoNumericoComponent } from './teclado-numerico.component';

describe('TecladoNumericoComponent', () => {
  let fixture: ComponentFixture<TecladoNumericoComponent>;
  let componente: TecladoNumericoComponent;

  function boton(testId: string): HTMLButtonElement {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TecladoNumericoComponent] });
    fixture = TestBed.createComponent(TecladoNumericoComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('arranca en cero y reemplaza el cero al primer dígito', () => {
    expect(fixture.nativeElement.textContent).toContain('0');

    boton('tecla-5').click();
    fixture.detectChanges();
    expect(componente.valor()).toBe('5');

    boton('tecla-0').click();
    fixture.detectChanges();
    expect(componente.valor()).toBe('50');
  });

  it('permite una sola coma decimal', () => {
    boton('tecla-1').click();
    boton('tecla-decimal').click();
    boton('tecla-decimal').click();
    boton('tecla-5').click();
    fixture.detectChanges();

    expect(componente.valor()).toBe('1.5');
  });

  it('borra de a un carácter y vuelve a cero', () => {
    componente.valor.set('12');
    fixture.detectChanges();

    boton('tecla-borrar').click();
    fixture.detectChanges();
    expect(componente.valor()).toBe('1');

    boton('tecla-borrar').click();
    fixture.detectChanges();
    expect(componente.valor()).toBe('0');
  });

  it('respeta el máximo de dígitos', () => {
    fixture.componentRef.setInput('maxDigitos', 2);
    fixture.detectChanges();

    boton('tecla-9').click();
    boton('tecla-9').click();
    boton('tecla-9').click();
    fixture.detectChanges();

    expect(componente.valor()).toBe('99');
  });

  it('oculta la coma cuando no admite decimales', () => {
    fixture.componentRef.setInput('permiteDecimales', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="tecla-decimal"]')).toBeNull();
  });
});
