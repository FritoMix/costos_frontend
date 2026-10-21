# Dependencias y escaneo de seguridad

El CI ejecuta dos comprobaciones:

```bash
npm audit --omit=dev --audit-level=high   # dependencias que llegan al navegador
npm audit --audit-level=critical          # crítica en cualquier dependencia
```

Estado al cerrar Sprint 3:

- Dependencias de producción: **0 vulnerabilidades**.
- Dependencias de desarrollo: queda `braces` (GHSA-vfj7-8cjw-p6xm), alta,
  usada solo por el watcher de Karma en desarrollo. No se publica en la
  imagen de producción y no procesa patrones de usuarios. No hay versión
  corregida disponible; se revisa en cada actualización de Angular/Karma.
- `@modelcontextprotocol/sdk` y `vite` se fuerzan a versiones corregidas
  con `overrides` en `package.json`, para no esperar a un cambio mayor de
  Angular CLI.
- Angular se actualizó a la última 20.3.x (parche de seguridad de router).

Dependabot abre PR semanales para npm y GitHub Actions.
