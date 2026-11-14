import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AlarmaService } from '../../core/servicios/alarma.service';
import { LoginPage } from './login.page';

describe('Experiencia del acceso ante errores temporales', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AlarmaService, useValue: { prepararTrasInteraccion: () => undefined } },
      ],
    });
    spyOn(TestBed.inject(Router), 'navigateByUrl').and.returnValue(Promise.resolve(true));
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('mantiene lo escrito y explica una limitación por IP sin impedir reintentar', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    const usuario = fixture.nativeElement.querySelector(
      '[data-testid="login-usuario"]',
    ) as HTMLInputElement;
    const password = fixture.nativeElement.querySelector(
      '[data-testid="login-password"]',
    ) as HTMLInputElement;
    usuario.value = 'admin';
    usuario.dispatchEvent(new Event('input'));
    password.value = 'clave-ficticia';
    password.dispatchEvent(new Event('input'));
    const enviar = fixture.nativeElement.querySelector(
      '[data-testid="login-submit"]',
    ) as HTMLButtonElement;
    enviar.click();
    http
      .expectOne('/api/v1/auth/login')
      .flush('<html>429</html>', { status: 429, statusText: 'Too Many Requests' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Demasiados intentos',
    );
    expect(usuario.value).toBe('admin');
    expect(password.value).toBe('clave-ficticia');
    expect(enviar.disabled).toBeFalse();
    enviar.click();
    http.expectOne('/api/v1/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Revisa el usuario',
    );
    fixture.destroy();
  });
});
