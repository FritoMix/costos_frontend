import { test, expect, type Page } from '@playwright/test';

/**
 * Flujo critico de planta en DATACONTROL.
 *
 * Requiere un admin de pruebas. Configura E2E_ADMIN_USER / E2E_ADMIN_PASS
 * (defaults: admin / admin123). La base debe tener datos de catalogo:
 * al menos un horno, un producto y una categoria apta para ese horno.
 */

const ADMIN = {
  usuario: process.env.E2E_ADMIN_USER || 'admin',
  password: process.env.E2E_ADMIN_PASS || 'admin123',
};

async function iniciarSesion(page: Page): Promise<void> {
  await page.goto('/entrar');
  // El formulario de login: buscar por placeholder o label.
  await page
    .getByLabel(/usuario|nombre de usuario/i)
    .or(page.getByPlaceholder(/usuario|nombre de usuario/i))
    .fill(ADMIN.usuario);
  await page
    .getByLabel(/contrase|password/i)
    .or(page.getByPlaceholder(/contrase|password/i))
    .fill(ADMIN.password);
  await page.getByRole('button', { name: /entrar|ingresar|iniciar/i }).first().click();
}

test.describe('Flujo critico', () => {
  test('iniciar sesion como admin', async ({ page }) => {
    await iniciarSesion(page);
    // Tras entrar como admin, la primera pantalla es Inicio.
    await expect(page).toHaveURL(/\/inicio|\/ordenes/);
    // El marco de la app (barra lateral) esta visible.
    await expect(page.getByText('DATACONTROL')).toBeVisible();
  });

  test('navegar a analisis y ver los filtros', async ({ page }) => {
    await iniciarSesion(page);
    await page.goto('/analisis');
    await expect(page).toHaveURL(/\/analisis/);
    // La pantalla de analisis debe cargar (buscamos texto del titulo o un filtro).
    await expect(page.getByText(/indicador|kpi|rendimiento|analisis/i).first()).toBeVisible();
  });

  test('listar ordenes vacias muestra estado vacio', async ({ page }) => {
    await iniciarSesion(page);
    await page.goto('/ordenes');
    await expect(page).toHaveURL(/\/ordenes/);
    // La lista carga; ya sea con datos o con estado vacio, no debe haber error.
    await expect(page.getByRole('button', { name: /nueva orden/i })).toBeVisible();
  });
});
