import { provideHttpClient, withInterceptors } from '@angular/common/http';
import type { ApplicationConfig} from '@angular/core';
import { LOCALE_ID, isDevMode, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { rutas } from './app.routes';
import { authInterceptor } from './core/interceptores/auth.interceptor';
import { cacheInterceptor } from './core/interceptores/cache.interceptor';
import { erroresInterceptor } from './core/interceptores/errores.interceptor';

// Fechas y numeros con el formato de Colombia (1.234,56 y dd/mm/aaaa).
registerLocaleData(localeEsCo);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // withComponentInputBinding: los parametros de la ruta (:id) llegan
    // directo como inputs del componente.
    provideRouter(rutas, withComponentInputBinding()),
    // La app habla siempre con la API real (FastAPI + PostgreSQL): el token
    // se agrega solo, los errores se traducen a mensajes en español y las
    // respuestas GET se cachean brevemente para evitar requests repetidos.
    provideHttpClient(
      withInterceptors([authInterceptor, cacheInterceptor, erroresInterceptor]),
    ),
    // Transiciones de pantalla al navegar (se carga solo cuando hace falta).
    provideAnimationsAsync(),
    { provide: LOCALE_ID, useValue: 'es-CO' },
    // PWA: instala la app como aplicación nativa y la deja funcionando
    // offline (el service worker y ngsw.json se generan solo en build de
    // producción, por eso aquí usamos isDevMode()). En desarrollo el SW
    // nunca se registra para no meter cachés que compliquen el iterado.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:3000',
    }),
  ],
};
