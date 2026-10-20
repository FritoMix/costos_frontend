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
  // El seed y los datos de catálogo son compartidos: una sola pestaña a la vez.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  outputDir: 'test-results',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // En local levanta `ng serve` (proxy /api -> :8000). En CI el stack ya
  // viene de Docker Compose y se omite con E2E_SKIP_WEBSERVER=1.
  webServer: process.env['E2E_SKIP_WEBSERVER']
    ? undefined
    : {
        command: 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
