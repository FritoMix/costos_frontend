import { test as base, type Page } from '@playwright/test';

/**
 * El aviso grande de planta (sirena + ventana en el centro) aparece cada vez
 * que llega un aviso nuevo y tapa la pantalla a propósito. Las pruebas no son
 * una persona mirando la tablet: cuando aparezca, lo cierran con "Entendido"
 * y siguen con lo que estaban haciendo.
 */
export async function cerrarAvisosGrandes(page: Page): Promise<void> {
  await page.addLocatorHandler(
    page.getByTestId('aviso-grande'),
    async (aviso) => {
      // Si el aviso ya se cerró (otra pestaña, otro clic), no hay nada que hacer.
      await aviso
        .getByRole('button', { name: 'Entendido' })
        .click({ timeout: 3000 })
        .catch(() => undefined);
    },
    { noWaitAfter: true },
  );
}

/** `test` de Playwright con el aviso grande ya manejado en cada página. */
export const test = base.extend({
  page: async ({ page }, usar) => {
    await cerrarAvisosGrandes(page);
    await usar(page);
  },
});

export { expect } from '@playwright/test';
