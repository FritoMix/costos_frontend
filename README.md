# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.35.

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

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

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

| Ajuste | Valor |
| --- | --- |
| Framework Preset | Angular |
| Build Command | `npm run build` |
| Output Directory | `dist/frontend/browser` |
