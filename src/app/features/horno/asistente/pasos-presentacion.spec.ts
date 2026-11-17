import { TestBed } from '@angular/core/testing';

import { PasoAceiteHornoComponent } from './paso-aceite.component';
import { PasoHorarioHornoComponent } from './paso-horario.component';
import { PasoPersonalHornoComponent } from './paso-personal.component';

describe('Pasos de presentación del asistente de horno', () => {
  it('muestra el horario y delega los ajustes al coordinador', () => {
    const fixture = TestBed.createComponent(PasoHorarioHornoComponent);
    fixture.componentRef.setInput('horaInicio', '23:30');
    fixture.componentRef.setInput('horaFin', '00:30');
    fixture.componentRef.setInput('ajustes', [15, 30, 60]);
    const atrasar = jasmine.createSpy('atrasar');
    const reiniciar = jasmine.createSpy('reiniciar');
    fixture.componentInstance.atrasar.subscribe(atrasar);
    fixture.componentInstance.reiniciar.subscribe(reiniciar);
    fixture.detectChanges();
    const vista = fixture.nativeElement as HTMLElement;
    expect(vista.textContent).toContain('23:30');
    expect(vista.textContent).toContain('00:30');
    const botones = vista.querySelectorAll('button');
    botones[1].click();
    expect(atrasar).toHaveBeenCalledOnceWith(30);
    botones[3].click();
    expect(reiniciar).toHaveBeenCalledTimes(1);
    // La fecha no cambia por cuenta del hijo: la mantiene el componente principal.
    expect(fixture.componentInstance.horaInicio()).toBe('23:30');
    fixture.destroy();
  });

  for (const [prefijo, area, opciones] of [
    ['personal-zona-', 'en zona húmeda', [3, 4, 5]],
    ['personal-seleccion-', 'en selección', [4, 5, 6, 7, 8]],
  ] as const) {
    it(`conserva selección, evento y controles de ${area}`, () => {
      const fixture = TestBed.createComponent(PasoPersonalHornoComponent);
      fixture.componentRef.setInput('opciones', opciones);
      fixture.componentRef.setInput('area', area);
      fixture.componentRef.setInput('prefijoTestId', prefijo);
      fixture.componentRef.setInput('valor', 0);
      const cambio = jasmine.createSpy('valorChange');
      fixture.componentInstance.valor.subscribe(cambio);
      fixture.detectChanges();
      const boton = (fixture.nativeElement as HTMLElement).querySelector(
        `[data-testid="${prefijo}5"]`,
      ) as HTMLButtonElement;
      boton.click();
      fixture.detectChanges();
      expect(cambio).toHaveBeenCalledOnceWith(5);
      expect(fixture.componentInstance.valor()).toBe(5);
      expect(boton.classList.contains('bg-marca-600')).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain(area);
      // Al volver a entrar al paso, se respeta el valor almacenado por el coordinador.
      fixture.componentRef.setInput('valor', 4);
      fixture.detectChanges();
      expect(boton.classList.contains('bg-marca-600')).toBeFalse();
      expect(fixture.componentInstance.valor()).toBe(4);
      fixture.destroy();
    });
  }

  it('mantiene el teclado de aceite y el aviso de consumo sin calcular reglas propias', () => {
    const fixture = TestBed.createComponent(PasoAceiteHornoComponent);
    fixture.componentRef.setInput('valor', '0');
    const cambio = jasmine.createSpy('valorChange');
    fixture.componentInstance.valor.subscribe(cambio);
    fixture.detectChanges();
    const vista = fixture.nativeElement as HTMLElement;
    expect(vista.textContent).not.toContain('Consumo de aceite');
    (vista.querySelector('[data-testid="tecla-5"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(cambio).toHaveBeenCalledOnceWith('5');
    expect(vista.querySelector('[data-testid="teclado-valor"]')?.textContent?.trim()).toBe('5');
    fixture.componentRef.setInput('consumoCm', 2.5);
    fixture.detectChanges();
    expect(vista.textContent).toContain('Consumo de aceite');
    fixture.componentRef.setInput('consumoCm', -1);
    fixture.detectChanges();
    expect(vista.textContent).toContain('El nivel final no puede ser mayor que el inicial');
    fixture.destroy();
  });
});
