import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de extremo a extremo (E2E) de DATACONTROL.
 *
 * Cubren el flujo critico de la planta: iniciar sesion, crear una orden,
 * registrar una tanda de horno, una recepcion de saborizado y ver el
 * resultado en Analisis. Requieren un backend + base de datos corriendo
 * (ver `npm run dev` y la carpeta `backdata`).
 *
 * Cambia la BASE_URL si tu entorno corre en otro puerto.
 */

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Antes de correr: la API y el front deben estar arriba.
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
