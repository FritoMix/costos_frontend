import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AuthService } from '../servicios/auth.service';
import { cambiosGuard, protegerRecarga } from './cambios.guard';

@Component({ template: '' })
class EditorPrueba {
  readonly formulario = new FormGroup({ nombre: new FormControl('') });
  cambiosPendientes(): boolean {
    return this.formulario.dirty;
  }
  constructor() {
    protegerRecarga(() => this.cambiosPendientes());
  }
}
@Component({ template: '' })
class DestinoPrueba {}

describe('protección de cambios sin guardar', () => {
  let auth: { usuario: jasmine.Spy };
  beforeEach(() => {
    auth = { usuario: jasmine.createSpy().and.returnValue({ id: 1 }) };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        provideRouter([
          { path: 'editar', component: EditorPrueba, canDeactivate: [cambiosGuard] },
          { path: 'salir', component: DestinoPrueba },
        ]),
      ],
    });
  });

  it('cargar valores desde la API no genera una confirmación', async () => {
    const confirmar = spyOn(window, 'confirm');
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/editar', EditorPrueba);
    editor.formulario.patchValue({ nombre: 'Cargado' });
    await harness.navigateByUrl('/salir', DestinoPrueba);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('cancelar conserva la pantalla y los datos; confirmar permite salir', async () => {
    const confirmar = spyOn(window, 'confirm').and.returnValue(false);
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/editar', EditorPrueba);
    editor.formulario.setValue({ nombre: 'Pendiente' });
    editor.formulario.markAsDirty();
    await harness.navigateByUrl('/salir');
    expect(harness.routeDebugElement?.componentInstance).toBe(editor);
    expect(editor.formulario.value.nombre).toBe('Pendiente');
    confirmar.and.returnValue(true);
    await harness.navigateByUrl('/salir', DestinoPrueba);
    expect(confirmar).toHaveBeenCalledTimes(2);
  });

  it('permite salir después de guardar y marcar el formulario limpio', async () => {
    const confirmar = spyOn(window, 'confirm');
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/editar', EditorPrueba);
    editor.formulario.markAsDirty();
    editor.formulario.markAsPristine();
    await harness.navigateByUrl('/salir', DestinoPrueba);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('una sesión terminada puede redirigir sin confirmación', async () => {
    const confirmar = spyOn(window, 'confirm');
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/editar', EditorPrueba);
    editor.formulario.markAsDirty();
    auth.usuario.and.returnValue(null);
    await harness.navigateByUrl('/salir', DestinoPrueba);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('protege recargas y retira el listener al destruir la pantalla', async () => {
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/editar', EditorPrueba);
    editor.formulario.markAsDirty();
    const evento = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBeTrue();
    spyOn(window, 'confirm').and.returnValue(true);
    await harness.navigateByUrl('/salir', DestinoPrueba);
    const despues = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(despues);
    expect(despues.defaultPrevented).toBeFalse();
  });
});
