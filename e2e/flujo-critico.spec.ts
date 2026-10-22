import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * Flujo crítico de planta, de punta a punta.
 *
 * Login → crear orden → iniciar → tanda de horno → recepción de saborizado
 * → análisis → exportar CSV. Usa selectores `data-testid` estables y datos
 * que el global-setup deja preparados de forma idempotente.
 *
 * Las credenciales salen de E2E_ADMIN_USER / E2E_ADMIN_PASS.
 */

const USUARIO = process.env['E2E_ADMIN_USER'] || 'admin';
const PASSWORD = process.env['E2E_ADMIN_PASS'] || '';
const CATEGORIA = process.env['E2E_CATEGORIA'] || 'Papa Hojuela';
const PRODUCTO = 'Producto E2E';
const REFERENCIA_PAPA = 'Papa E2E';

let ordenId: number | null = null;
let numeroOrden = '';

async function iniciarSesion(page: Page): Promise<void> {
  await page.goto('/entrar');
  await expect(page.getByTestId('login-usuario')).toBeVisible();
  await page.getByTestId('login-usuario').fill(USUARIO);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/inicio/);
}

async function esperarPaso(page: Page, paso: string): Promise<void> {
  await expect(page.getByTestId(`paso-${paso}`)).toBeVisible();
}

async function continuar(page: Page, testId: string): Promise<void> {
  const boton = page.getByTestId(testId);
  await expect(boton).toBeEnabled();
  await boton.click();
}

async function sinViolacionesCriticas(page: Page, contexto: string): Promise<void> {
  const resultado = await new AxeBuilder({ page }).analyze();
  const criticas = resultado.violations.filter((v) => v.impact === 'critical');
  expect(
    criticas,
    `${contexto}: ${criticas.map((v) => `${v.id} (${v.nodes.length} nodo(s))`).join(', ')}`,
  ).toEqual([]);
}

test.describe('Flujo crítico de planta', () => {
  test.afterEach(async ({ page }) => {
    if (ordenId === null) {
      return;
    }
    try {
      // page.request comparte las cookies de sesión del navegador.
      // Cancelar antes de borrar libera el horno incluso si el test falló
      // mientras la orden estaba en producción.
      await page.request.post(`/api/v1/ordenes/${ordenId}/cancelar`);
      await page.request.delete(`/api/v1/ordenes/${ordenId}`);
    } catch {
      // Si el navegador ya se cerró, el global-setup limpiará en la próxima corrida.
    } finally {
      ordenId = null;
      numeroOrden = '';
    }
  });

  test('login, orden, horno, saborizado, análisis y exportación', async ({ page }) => {
    await test.step('login con credenciales de entorno', async () => {
      await page.goto('/entrar');
      await expect(page.getByTestId('login-usuario')).toBeVisible();
      await sinViolacionesCriticas(page, 'login');

      await page.getByTestId('login-usuario').fill(USUARIO);
      await page.getByTestId('login-password').fill(PASSWORD);
      await page.getByTestId('login-submit').click();

      await expect(page).toHaveURL(/\/inicio/);
      await expect(page.getByRole('heading', { name: /Hola,/ })).toBeVisible();
      await sinViolacionesCriticas(page, 'inicio');
    });

    await test.step('consultar la bodega de papa', async () => {
      await expect(page.getByRole('link', { name: 'Bodega de Papa' }).first()).toBeVisible();
      await page.goto('/bodega');
      await expect(page.getByRole('heading', { name: /Bodega de Papa/ })).toBeVisible();
      await expect(page.getByText(REFERENCIA_PAPA).first()).toBeVisible();
      await sinViolacionesCriticas(page, 'bodega de papa');
    });

    await test.step('crear una orden con el asistente', async () => {
      await page.goto('/ordenes/nueva');
      await esperarPaso(page, 'destino');
      await page.getByTestId('opcion-destino-nacional').click();

      await esperarPaso(page, 'categoria');
      await page
        .getByTestId('paso-categoria')
        .getByRole('button', { name: new RegExp(CATEGORIA, 'i') })
        .click();

      await esperarPaso(page, 'producto');
      await page
        .getByTestId('paso-producto')
        .getByRole('button', { name: new RegExp(PRODUCTO, 'i') })
        .click();

      await esperarPaso(page, 'horas');
      await continuar(page, 'horas-1');

      await esperarPaso(page, 'horno');
      await page.getByTestId('opcion-horno').first().click();

      await esperarPaso(page, 'turno');
      await page.getByTestId('opcion-turno').first().click();

      await esperarPaso(page, 'unidad');
      await page.getByTestId('opcion-unidad-kg').click();

      await esperarPaso(page, 'cantidad');
      await page.getByTestId('cantidad-input').fill('250');
      await expect(page.getByTestId('continuar-orden')).toBeEnabled();
      await page.getByTestId('continuar-orden').click();

      await esperarPaso(page, 'resumen');
      await expect(page.getByText(PRODUCTO).first()).toBeVisible();
      await page.getByTestId('crear-orden').click();

      await expect(page).toHaveURL(/\/ordenes\/\d+$/);
      ordenId = Number(page.url().match(/\/ordenes\/(\d+)$/)?.[1]);
      expect(ordenId).toBeGreaterThan(0);

      const numeroVisible = await page.getByTestId('orden-numero').innerText();
      numeroOrden = numeroVisible.replace('#', '').trim();
      expect(numeroOrden).toMatch(/^[A-Z0-9-]+$/);
      await expect(page.getByText('Pendiente', { exact: true }).first()).toBeVisible();
      await sinViolacionesCriticas(page, 'detalle de orden');
    });

    await test.step('iniciar la producción', async () => {
      await page.getByTestId('iniciar-orden').click();
      await expect(page.getByTestId('finalizar-orden')).toBeVisible();
      await expect(page.getByText(/En producción/i).first()).toBeVisible();
    });

    await test.step('registrar la tanda de horno', async () => {
      await page.goto(`/horno/${ordenId}`);
      await esperarPaso(page, 'horario');
      await continuar(page, 'continuar-horno');

      await esperarPaso(page, 'referencia_papa');
      await page
        .getByTestId('paso-referencia_papa')
        .getByRole('button', { name: new RegExp(REFERENCIA_PAPA, 'i') })
        .click();
      await continuar(page, 'continuar-horno');

      await esperarPaso(page, 'bultos');
      await page.getByTestId('bultos-40').click();
      await expect(page.getByTestId('horno-preview')).toBeVisible();
      await expect(page.getByTestId('horno-kg-crudos')).toContainText('2.000');
      await expect(page.getByTestId('horno-kg-fritos')).toContainText('500');
      await continuar(page, 'continuar-horno');

      await esperarPaso(page, 'temperatura');
      await page.getByTestId('temperatura-180').click();
      await continuar(page, 'continuar-horno');

      await esperarPaso(page, 'personal_zona_humeda');
      await page.getByTestId('personal-zona-5').click();
      await continuar(page, 'continuar-horno');

      await esperarPaso(page, 'personal_seleccion');
      await page.getByTestId('personal-seleccion-5').click();
      await continuar(page, 'continuar-horno');

      await esperarPaso(page, 'aceite_inicial');
      await page.getByTestId('tecla-5').click();
      await page.getByTestId('tecla-0').click();
      await expect(page.getByTestId('teclado-valor')).toHaveText('50');
      await continuar(page, 'continuar-horno');

      await esperarPaso(page, 'aceite_final');
      await page.getByTestId('tecla-4').click();
      await page.getByTestId('tecla-5').click();
      await expect(page.getByTestId('teclado-valor')).toHaveText('45');
      await continuar(page, 'continuar-horno');

      await esperarPaso(page, 'desperdicio');
      await page.getByTestId('sin-desperdicio').click();

      await esperarPaso(page, 'resumen');
      await page.getByTestId('guardar-tanda').click();
      await expect(page).toHaveURL(/\/horno$/);

      // La orden de una hora ya no permite otra tanda de horno.
      await page.goto(`/horno/${ordenId}`);
      await expect(page.getByTestId('horno-orden-completa')).toBeVisible();
      await expect(page.getByText(REFERENCIA_PAPA).first()).toBeVisible();
      await expect(page.getByTestId('guardar-tanda')).toHaveCount(0);

      await page.goto(`/ordenes/${ordenId}`);
      await page.getByTestId('tab-horno').click();
      await expect(page.getByText('40 bto').first()).toBeVisible();
      await expect(page.getByText('180 °C').first()).toBeVisible();
    });

    await test.step('registrar la recepción de saborizado', async () => {
      await page.goto(`/saborizado/${ordenId}`);
      await esperarPaso(page, 'horario');
      await continuar(page, 'continuar-saborizado');

      await esperarPaso(page, 'sabor');
      await page.getByTestId('sabor-opcion').first().click();
      await continuar(page, 'continuar-saborizado');

      await esperarPaso(page, 'cantidad_sabor');
      await page.getByTestId('tecla-2').click();
      await continuar(page, 'continuar-saborizado');

      await esperarPaso(page, 'canastillas');
      await page.getByTestId('tecla-2').click();
      await page.getByTestId('tecla-5').click();
      await expect(page.getByTestId('teclado-valor')).toHaveText('25');
      await page.getByTestId('agregar-canastilla').click();
      await expect(page.getByText('25 kg').first()).toBeVisible();
      await continuar(page, 'continuar-saborizado');

      await esperarPaso(page, 'resumen');
      await page.getByTestId('registrar-recepcion').click();
      await expect(page.getByText(/Recepciones ya registradas \(1\)/)).toBeVisible();
      await expect(page.getByTestId('saborizado-orden-completa')).toBeVisible();
      await expect(page.getByTestId('registrar-recepcion')).toHaveCount(0);

      await page.goto(`/ordenes/${ordenId}`);
      await page.getByTestId('tab-saborizado').click();
      await expect(page.getByText('25 kg').first()).toBeVisible();
    });

    await test.step('ver análisis y exportar CSV', async () => {
      await page.goto('/analisis');
      await expect(page.getByTestId('analisis-titulo')).toBeVisible();
      await expect(page.getByText('Órdenes Procesadas')).toBeVisible();
      await expect(page.getByText(`#${numeroOrden}`).first()).toBeVisible();

      const [descarga] = await Promise.all([
        page.waitForEvent('download'),
        page.getByTestId('exportar-csv').click(),
      ]);

      expect(descarga.suggestedFilename()).toMatch(/^datacontrol_.*\.csv$/);
      const ruta = await descarga.path();
      expect(ruta).not.toBeNull();
      const csv = await readFile(ruta!, 'utf8');
      expect(csv).toContain('numero_orden');
      expect(csv).toContain(numeroOrden);
      expect(csv).toContain(PRODUCTO);
    });
  });
});
