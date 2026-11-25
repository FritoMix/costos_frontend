import { type Page } from '@playwright/test';
import { test, expect } from './avisos';

/**
 * Líneas de producción y «olvidé mi contraseña» (V21), de punta a punta.
 *
 * Crea por la API un horno, una categoría y un producto de la línea de
 * plátano; monta la orden con el asistente (línea → variedad → kilos, sin
 * fórmula de Bodega) y al final desactiva el horno para no cambiar el
 * asistente de las demás pruebas. Luego un operario pide su contraseña, el
 * administrador le da una temporal y el operario crea la suya al entrar.
 */

const USUARIO = process.env['E2E_ADMIN_USER'] || 'admin';
const PASSWORD = process.env['E2E_ADMIN_PASS'] || '';
const SUFIJO = Date.now().toString().slice(-6);

interface ConId {
  id: number;
}

async function entrar(page: Page, usuario = USUARIO, clave = PASSWORD): Promise<void> {
  await page.goto('/entrar');
  await page.getByTestId('login-usuario').fill(usuario);
  await page.getByTestId('login-password').fill(clave);
  await page.getByTestId('login-submit').click();
}

async function api<T>(page: Page, metodo: 'get' | 'post' | 'put' | 'delete', ruta: string, data?: unknown): Promise<T> {
  const respuesta = await page.request[metodo](`/api/v1${ruta}`, data === undefined ? undefined : { data });
  expect(respuesta.ok(), `${metodo.toUpperCase()} ${ruta}: ${await respuesta.text()}`).toBeTruthy();
  return (respuesta.status() === 204 ? null : await respuesta.json()) as T;
}

test('orden de plátano: línea, tipo y kilos, sin fórmula de Bodega', async ({ page }) => {
  await entrar(page);
  await expect(page).toHaveURL(/\/inicio/);

  const lineas = await api<(ConId & { codigo: string })[]>(page, 'get', '/catalogos/lineas');
  const platano = lineas.find((l) => l.codigo === 'platano')!;
  const categoria = await api<ConId>(page, 'post', '/catalogos/categorias', {
    nombre: `Plátano E2E ${SUFIJO}`,
    activo: true,
  });
  const horno = await api<ConId>(page, 'post', '/catalogos/hornos', {
    nombre: `Horno Plátano ${SUFIJO}`,
    activo: true,
    apto_exportacion: false,
    linea_id: platano.id,
    categoria_ids: [categoria.id],
  });
  await api(page, 'post', '/catalogos/productos', {
    nombre_comercial: `Tostón E2E ${SUFIJO}`,
    categoria_id: categoria.id,
    activo: true,
    destino: 'ambos',
    sabor_minimo_pct: 1.5,
    sabor_maximo_pct: 2.5,
  });

  let ordenId: number | null = null;
  try {
    await page.goto('/ordenes/nueva');
    // Hay hornos de dos líneas: el asistente pregunta la línea.
    await expect(page.getByTestId('paso-linea')).toBeVisible();
    await page.getByTestId('opcion-linea-platano').click();
    await expect(page.getByTestId('paso-destino')).toBeVisible();
    await page.getByTestId('opcion-destino-nacional').click();
    await expect(page.getByTestId('paso-categoria')).toBeVisible();
    // Solo aparecen las categorías de la línea de plátano.
    await expect(page.getByTestId('opcion-categoria')).toHaveCount(1);
    await page.getByTestId('opcion-categoria').click();
    await expect(page.getByTestId('paso-producto')).toBeVisible();
    await page.getByRole('button', { name: new RegExp(`Tostón E2E ${SUFIJO}`) }).click();
    await expect(page.getByTestId('paso-variedad')).toBeVisible();
    await page.getByTestId('opcion-variedad').filter({ hasText: 'Hartón' }).click();
    await expect(page.getByTestId('paso-horas')).toBeVisible();
    await page.getByTestId('horas-1').click();
    await expect(page.getByTestId('paso-horno')).toBeVisible();
    await page.getByTestId('opcion-horno').first().click();
    await expect(page.getByTestId('paso-turno')).toBeVisible();
    await page.getByTestId('opcion-turno').first().click();
    // Plátano solo se pide en kilos: no hay paso de unidad ni de fórmula.
    await expect(page.getByTestId('paso-cantidad')).toBeVisible();
    await page.getByTestId('cantidad-input').fill('300');
    await page.getByTestId('continuar-orden').click();
    await expect(page.getByTestId('paso-resumen')).toBeVisible();
    await expect(page.getByTestId('paso-resumen')).toContainText('Plátano');
    await expect(page.getByTestId('paso-resumen')).toContainText('Hartón');
    await expect(page.getByTestId('paso-resumen')).not.toContainText('Fórmula');
    await page.getByTestId('crear-orden').click();

    await expect(page).toHaveURL(/\/ordenes\/\d+$/);
    ordenId = Number(page.url().match(/\/ordenes\/(\d+)$/)?.[1]);
    const { orden } = await api<{
      orden: {
        linea: { codigo: string };
        variedad: { nombre: string };
        formula_estado: string;
        meta_texto: string;
      };
    }>(page, 'get', `/ordenes/${ordenId}`);
    expect(orden.linea.codigo).toBe('platano');
    expect(orden.variedad.nombre).toBe('Hartón');
    expect(orden.formula_estado).toBe('no_aplica');
    expect(orden.meta_texto).toBe('300 kg');
  } finally {
    if (ordenId) {
      await page.request.post(`/api/v1/ordenes/${ordenId}/cancelar`);
      await page.request.delete(`/api/v1/ordenes/${ordenId}`);
    }
    // Sin hornos de plátano activos el asistente vuelve a ser el de papa.
    await api(page, 'put', `/catalogos/hornos/${horno.id}`, {
      nombre: `Horno Plátano ${SUFIJO}`,
      activo: false,
      apto_exportacion: false,
      linea_id: platano.id,
      categoria_ids: [categoria.id],
    });
  }
});

test('olvidé mi contraseña: aviso, temporal y contraseña nueva', async ({ page }) => {
  await entrar(page);
  await expect(page).toHaveURL(/\/inicio/);
  const roles = await api<(ConId & { codigo: string })[]>(page, 'get', '/usuarios/roles');
  const nombreUsuario = `operario_e2e_${SUFIJO}`;
  const operario = await api<ConId>(page, 'post', '/usuarios', {
    nombre_completo: `Operario E2E ${SUFIJO}`,
    nombre_usuario: nombreUsuario,
    password: 'Clave-Inicial-2026!',
    rol_id: roles.find((r) => r.codigo === 'operario_horno')!.id,
    activo: true,
  });

  try {
    // 1. El operario la pide desde el login (sin sesión).
    await page.request.post('/api/v1/auth/logout');
    await page.goto('/entrar');
    await page.getByTestId('olvide-clave').click();
    await expect(page).toHaveURL(/\/olvide-clave$/);
    await page.getByTestId('olvide-usuario').fill(nombreUsuario);
    await page.getByTestId('olvide-enviar').click();
    await expect(page.getByRole('status')).toContainText('contraseña temporal');

    // 2. El administrador le da una temporal desde Usuarios.
    await entrar(page);
    await expect(page).toHaveURL(/\/inicio/);
    await page.goto('/usuarios');
    const escritorio = page.viewportSize()!;
    await page.setViewportSize({ width: 320, height: 640 });
    await page.getByTestId(`clave-temporal-${nombreUsuario}`).click();
    const confirmar = page.getByRole('dialog', { name: /Dar contraseña temporal/ });
    await expect(confirmar).toBeInViewport({ ratio: 1 });
    await expect(confirmar).toHaveJSProperty('open', true);
    await expect.poll(() => confirmar.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await confirmar.getByRole('button', { name: 'Sí, generar' }).click();
    const dialogoClave = page.getByRole('dialog', { name: 'Contraseña temporal generada' });
    await expect(dialogoClave).toBeInViewport({ ratio: 1 });
    const temporal = (await page.getByTestId('clave-temporal-valor').innerText()).trim();
    expect(temporal).toMatch(/^\d{8}$/);
    await dialogoClave.getByRole('button', { name: 'Listo, ya la dicté' }).click();
    await page.setViewportSize(escritorio);
    await page.request.post('/api/v1/auth/logout');

    // 3. Entra con la temporal: la app le pide crear la suya antes de seguir.
    await entrar(page, nombreUsuario, temporal);
    await expect(page).toHaveURL(/\/crear-clave$/);
    await page.goto('/inicio');
    await expect(page).toHaveURL(/\/crear-clave$/);
    await page.getByLabel('Contraseña temporal').fill(temporal);
    await page.getByLabel('Contraseña nueva', { exact: true }).fill('Clave-Propia-2026!');
    await page.getByLabel('Repite la contraseña nueva').fill('Clave-Propia-2026!');
    await page.getByRole('button', { name: 'Guardar y entrar' }).click();
    await expect(page).not.toHaveURL(/\/crear-clave$/);
  } finally {
    await page.request.post('/api/v1/auth/logout');
    await entrar(page);
    await page.request.delete(`/api/v1/usuarios/${operario.id}`);
  }
});

test('el administrador recupera su acceso con un código de recuperación', async ({ page }) => {
  // Un administrador aparte, para no tocar la contraseña del admin de las pruebas.
  await entrar(page);
  await expect(page).toHaveURL(/\/inicio/);
  const roles = await api<(ConId & { codigo: string })[]>(page, 'get', '/usuarios/roles');
  const nombreUsuario = `admin_e2e_${SUFIJO}`;
  const inicial = 'Clave-Admin-2026!';
  const nueva = 'Clave-Recuperada-2026!';
  const admin = await api<ConId>(page, 'post', '/usuarios', {
    nombre_completo: `Admin E2E ${SUFIJO}`,
    nombre_usuario: nombreUsuario,
    password: inicial,
    rol_id: roles.find((r) => r.codigo === 'admin')!.id,
    activo: true,
  });

  try {
    // 1. Genera sus códigos desde Mi cuenta (pide la contraseña actual).
    await page.request.post('/api/v1/auth/logout');
    await entrar(page, nombreUsuario, inicial);
    await expect(page).toHaveURL(/\/inicio/);
    await page.goto('/mi-cuenta');
    await expect(page.getByTestId('estado-codigos')).toContainText('Todavía no tienes códigos');
    await page.getByTestId('codigos-clave').fill(inicial);
    await page.getByTestId('codigos-generar').click();
    const codigos = page.getByTestId('lista-codigos').getByRole('listitem');
    await expect(codigos).toHaveCount(8);
    const codigo = (await codigos.first().innerText()).trim();
    expect(codigo).toMatch(/^[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/);
    await page.getByTestId('codigos-listo').click();
    await expect(page.getByTestId('estado-codigos')).toContainText('8 de 8');

    // 2. Sin sesión: un código mal escrito no lo saca del formulario.
    await page.request.post('/api/v1/auth/logout');
    await page.goto('/olvide-clave');
    await page.getByTestId('modo-codigo').click();
    await page.getByTestId('codigo-usuario').fill(nombreUsuario);
    await page.getByTestId('codigo-valor').fill('2222-2222-2222');
    await page.getByTestId('codigo-clave').fill(nueva);
    await page.getByTestId('codigo-clave-repetir').fill(nueva);
    await page.getByTestId('codigo-enviar').click();
    await expect(page.getByTestId('codigo-error')).toContainText('Usuario o código de recuperación incorrectos.');
    await expect(page).toHaveURL(/\/olvide-clave$/);

    // 3. Con el código correcto crea su contraseña nueva y entra con ella.
    await page.getByTestId('codigo-valor').fill(codigo.toLowerCase());
    await page.getByTestId('codigo-clave').fill(nueva);
    await page.getByTestId('codigo-clave-repetir').fill(nueva);
    await page.getByTestId('codigo-enviar').click();
    await expect(page.getByTestId('codigos-restantes')).toContainText('7');
    await page.getByTestId('ir-a-entrar').click();
    await entrar(page, nombreUsuario, nueva);
    await expect(page).toHaveURL(/\/inicio/);
  } finally {
    await page.request.post('/api/v1/auth/logout');
    await entrar(page);
    await page.request.delete(`/api/v1/usuarios/${admin.id}`);
  }
});
