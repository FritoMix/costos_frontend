import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { Observable} from 'rxjs';
import { tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { limpiarCache } from '../interceptores/cache.interceptor';
import type { CodigoRol, Credenciales, RespuestaLogin, Usuario } from '../modelos/identidad.model';

/**
 * Sesion del usuario: quien esta conectado y que puede hacer.
 *
 * El token de sesion NO vive en el frontend: viaja en una cookie HttpOnly
 * que el navegador maneja solo y que el JavaScript no puede leer (por
 * seguridad, para que un XSS no pueda robar la sesion). Por eso aqui no se
 * guarda ningun token: lo unico que sabemos es QUIEN esta conectado, y eso
 * se lo preguntamos a la API con /auth/yo.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _usuario = signal<Usuario | null>(null);
  // La sesion ya se comprobo contra la API al menos una vez en esta carga
  // de la app (para no volver a preguntar en cada guard).
  private readonly _sesionVerificada = signal(false);

  readonly usuario = this._usuario.asReadonly();
  readonly sesionVerificada = this._sesionVerificada.asReadonly();
  readonly rol = computed<CodigoRol | null>(() => this._usuario()?.rol.codigo ?? null);

  readonly esAdmin = computed(() => this.rol() === 'admin');
  readonly esSupervisor = computed(() => this.rol() === 'supervisor');
  readonly esOperarioHorno = computed(() => this.rol() === 'operario_horno');
  readonly esOperarioSaborizado = computed(() => this.rol() === 'operario_saborizado');

  constructor() {
    // Limpieza para navegadores que usaron la versión anterior (cuando el
    // token se guardaba en localStorage): se elimina ese resto para no
    // dejar rastro. La versión actual usa una cookie HttpOnly.
    try {
      localStorage.removeItem('datacontrol.token');
    } catch {
      // Modo incógnito o almacenamiento bloqueado: no pasa nada.
    }
  }

  iniciarSesion(credenciales: Credenciales): Observable<RespuestaLogin> {
    // La cookie HttpOnly la pone la respuesta del servidor (Set-Cookie);
    // aqui solo guardamos quien entro.
    return this.http
      .post<RespuestaLogin>(`${environment.apiUrl}/auth/login`, credenciales)
      .pipe(
        tap((respuesta) => {
          this._usuario.set(respuesta.usuario);
          this._sesionVerificada.set(true);
        }),
      );
  }

  /**
   * Comprueba si hay una sesion valida preguntando a la API (la cookie
   * viaja sola). Se usa al abrir la app o al recargar con F5.
   */
  recuperarSesion(): Observable<Usuario> {
    return this.http
      .get<Usuario>(`${environment.apiUrl}/auth/yo`)
      .pipe(
        tap((usuario) => {
          this._usuario.set(usuario);
          this._sesionVerificada.set(true);
        }),
      );
  }

  cambiarPassword(passwordActual: string, passwordNueva: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/cambiar-password`, {
      password_actual: passwordActual,
      password_nueva: passwordNueva,
    });
  }

  cerrarSesion(irALogin = true): void {
    // Le pedimos al servidor que borre la cookie; pase lo que pase, limpiamos
    // el estado local y volvemos al login.
    this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({
      next: () => this.limpiarLocal(irALogin),
      error: () => this.limpiarLocal(irALogin),
    });
  }

  /**
   * Limpia el estado en memoria sin llamar a la API. Lo usa el interceptor
   * de errores cuando la sesion ya expiro (un 401): la cookie ya no sirve,
   * no hace falta pedir el logout.
   */
  limpiarLocal(irALogin = true): void {
    this._usuario.set(null);
    this._sesionVerificada.set(true);
    limpiarCache();
    if (irALogin) {
      void this.router.navigate(['/entrar']);
    }
  }

  /** A donde mandar a cada rol despues de entrar: a lo que realmente usa. */
  rutaInicial(): string {
    switch (this.rol()) {
      case 'operario_horno':
        return '/horno';
      case 'operario_saborizado':
        return '/saborizado';
      case 'supervisor':
        return '/ordenes';
      default:
        return '/inicio';
    }
  }
}
