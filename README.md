# Frontend

This project uses [Angular CLI](https://github.com/angular/angular-cli) version 22.2.4 and requires Node.js 24.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Pruebas E2E (Playwright)

El flujo crítico de planta está en `e2e/flujo-critico.spec.ts`: login, crear
orden, iniciar producción, tanda de horno, recepción de saborizado, análisis
y descarga del CSV. Usa `data-testid` estables y un seed idempotente que crea
`Producto E2E` si falta; **no lo ejecutes contra la base de producción**.

Requisitos: API y frontend arriba, y la contraseña del administrador en una
variable de entorno (nunca en el repo):

```bash
E2E_ADMIN_PASS="tu-contraseña" npm run test:e2e
```

Por defecto Playwright levanta `npm run dev` en `http://localhost:3000` y
reutiliza la API de `http://localhost:8000`. Para apuntar a otro entorno:

```bash
E2E_BASE_URL="https://staging.ejemplo" \
E2E_ADMIN_USER="admin" \
E2E_ADMIN_PASS="..." \
E2E_SKIP_WEBSERVER=1 \
npm run test:e2e
```

### Stack de producción efímero

El workflow de CI construye las imágenes reales y valida Nginx + API +
PostgreSQL con `e2e/docker-compose.e2e.yml`. En local:

```bash
npx playwright install --with-deps chromium
E2E_ADMIN_PASS=e2e-admin-pass E2E_FRONT_PORT=4201 \
  docker compose -f e2e/docker-compose.e2e.yml up -d --build --wait

E2E_ADMIN_PASS=e2e-admin-pass \
E2E_BASE_URL=http://127.0.0.1:4201 \
E2E_SKIP_WEBSERVER=1 \
npm run test:e2e

docker compose -f e2e/docker-compose.e2e.yml down -v
```

En CI el backend se clona en `backdata` dentro del workspace y se pasa
`E2E_BACKEND_CONTEXT=../backdata`. Si el repo del backend es privado, define
el secreto `BACKEND_REPO_TOKEN` con permiso de lectura.

Los fallos dejan trazas, video y reporte HTML en `playwright-report/` y
`test-results/`; ambos están ignorados por Git y se publican como artefactos
en GitHub Actions.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Despliegue en Vercel

El frontend se publica en Vercel como sitio estático. Toda la configuración
está en `vercel.json`, que resuelve dos cosas:

**1. Las llamadas a la API.** La aplicación pide `/api/v1/...` en ruta
relativa, a propósito: así el navegador habla siempre con un solo origen. En
Vercel no hay backend, y un servidor de archivos estáticos solo acepta GET,
por lo que el `POST` del login respondía **405 Method Not Allowed**. El
`rewrite` reenvía `/api/*` al backend de Render sin que el navegador se entere:
para él sigue siendo el mismo dominio.

Esto no es un detalle de comodidad. La sesión viaja en una cookie
`HttpOnly` + `SameSite=Strict`, y con ese modo el navegador **no la envía entre
dominios distintos**. Si el frontend llamara al backend por su URL directa
(`https://...onrender.com`), el login devolvería 200 pero la sesión no se
mantendría. El proxy mantiene todo en el mismo origen y la cookie funciona.

**2. Las rutas internas.** Angular maneja la navegación en el navegador, así
que direcciones como `/ordenes` o `/horno/10` no existen como archivos. Sin la
segunda regla, recargar la página en cualquiera de ellas daría 404.

> **Al cambiar de backend**, hay que actualizar la URL de `destination` en
> `vercel.json`. Si se recrea el servicio en Render, el dominio cambia.

Configuración del proyecto en Vercel:

| Ajuste           | Valor                   |
| ---------------- | ----------------------- |
| Framework Preset | Angular                 |
| Build Command    | `npm run build`         |
| Output Directory | `dist/frontend/browser` |
