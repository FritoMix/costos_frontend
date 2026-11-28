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
  // Varias cuentas de prueba comparten la IP y el límite de acceso del proxy.
  for (let intento = 1; intento <= 4; intento++) {
    await page.getByTestId('login-usuario').fill(usuario);
    await page.getByTestId('login-password').fill(clave);
    const [respuesta] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/auth/login'),
      page.getByTestId('login-submit').click(),
    ]);
    if (respuesta.status() !== 429 || intento === 4) {
      expect(respuesta.status(), 'Respuesta del inicio de sesión').toBe(200);
      return;
    }
    const segundos = Number(respuesta.headers()['retry-after']);
    await new Promise((resolver) => setTimeout(resolver, (segundos > 0 ? segundos : 6) * 1000));
  }
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

test('capacidad del horno: plátano en kilos por hora, papa en bultos', async ({ page }) => {
  await entrar(page);
  await expect(page).toHaveURL(/\/inicio/);
  await page.goto('/catalogos/hornos');

  // Horno nuevo: por defecto es de papa y pide bultos por hora.
  await expect(page.getByTestId('horno-capacidad')).toBeVisible();
  await expect(page.getByTestId('horno-capacidad-kg')).toHaveCount(0);

  // Al elegir plátano la capacidad pasa a kilos por hora.
  const nombre = `Hojuelas kg ${SUFIJO}`;
  await page.locator('#nombre').fill(nombre);
  await page.locator('#linea_id').selectOption({ label: 'Plátano' });
  await expect(page.getByTestId('horno-capacidad')).toHaveCount(0);
  await page.getByTestId('horno-capacidad-kg').fill('450');
  // Inactivo para no cambiar el asistente de órdenes de las demás pruebas.
  await page.getByText('Horno Activo para Producción').click();
  await page.getByRole('button', { name: 'Registrar Horno' }).click();

  const fila = page.getByRole('row', { name: new RegExp(nombre) });
  await expect(fila).toContainText('450');
  await expect(fila).toContainText('kg/h');

  const hornos = await api<(ConId & { nombre: string; capacidad_kg_hora: string | null; capacidad_bultos_hora: string | null })[]>(
    page,
    'get',
    '/catalogos/hornos',
  );
  const creado = hornos.find((h) => h.nombre === nombre)!;
  expect(Number(creado.capacidad_kg_hora)).toBe(450);
  expect(creado.capacidad_bultos_hora).toBeNull();
  await api(page, 'delete', `/catalogos/hornos/${creado.id}`);
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
    const avisos = await api<{ tipo: string; mensaje: string }[]>(page, 'get', '/notificaciones');
    expect(avisos.some((a) => a.tipo === 'recuperar_password' && a.mensaje.includes(`(${nombreUsuario})`))).toBe(true);
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

test.describe('reintento desde el login móvil', () => {
  // Este caso simula una respuesta de red antes de reintentar contra la API real.
  test.use({ serviceWorkers: 'block' });

  test('un fallo al pedir la temporal permite reintentar con el mismo usuario', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/entrar');
    const enlace = page.getByRole('link', { name: '¿Olvidaste tu contraseña?' });
    await expect(enlace).toHaveAttribute('href', '/olvide-clave');
    expect((await enlace.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await enlace.click();
    await expect(page.getByRole('heading', { name: '¿Olvidaste tu contraseña?' })).toBeVisible();
    const enviar = page.getByTestId('olvide-enviar');
    const usuario = page.getByTestId('olvide-usuario');
    await enviar.click();
    await expect(page.getByTestId('aviso-error')).toContainText('Escribe tu usuario');
    await usuario.fill('persona_de_prueba');
    const ruta = '**/api/v1/auth/olvide-password';
    await page.route(ruta, (route) => route.fulfill({
      status: 429, headers: { 'Retry-After': '30' }, body: '',
    }), { times: 1 });
    await enviar.click();
    await expect(page.getByTestId('aviso-error')).toContainText('30 segundos');
    await expect(usuario).toHaveValue('persona_de_prueba');
    await enviar.click();
    await expect(page.getByRole('status')).toContainText('contraseña temporal');
    await expect(page.getByTestId('aviso-error')).toHaveCount(0);
  });
});

test('correo de recuperación: el administrador activa el envío y aparece «Por correo»', async ({ page }) => {
  await entrar(page);
  await expect(page).toHaveURL(/\/inicio/);
  await page.goto('/mi-cuenta');

  const envio = page.getByTestId('seccion-envio');
  await expect(envio.getByTestId('envio-estado')).toContainText('sin activar');
  await expect(envio.getByTestId('envio-script')).toHaveValue(/const SECRETO = '/);
  // Sin envío activo, el correo propio no se puede registrar todavía.
  await expect(page.getByTestId('correo-sin-envio')).toBeVisible();

  // Solo acepta una URL de Google Apps Script.
  await envio.getByTestId('envio-url').fill('https://otro-sitio.com/exec');
  await envio.getByTestId('envio-guardar').click();
  await expect(envio.getByTestId('envio-estado')).toContainText('sin activar');
  await envio.getByTestId('envio-url').fill('https://script.google.com/macros/s/AKfycbE2Eprueba1234567890/exec');
  await envio.getByTestId('envio-guardar').click();
  await expect(envio.getByTestId('envio-estado')).toContainText('Envío activo');
  await expect(page.getByTestId('correo-direccion')).toBeVisible();

  try {
    // «¿Olvidaste tu contraseña?» abre en «Por correo» y responde igual exista o no el usuario.
    const anonimo = await page.context().browser()!.newContext({ baseURL: new URL(page.url()).origin });
    const pagina = await anonimo.newPage();
    await pagina.goto('/olvide-clave');
    await expect(pagina.getByTestId('modo-correo')).toHaveAttribute('aria-selected', 'true');
    await pagina.getByTestId('correo-usuario').fill(`nadie_${SUFIJO}`);
    await pagina.clock.install();
    await pagina.getByTestId('correo-pedir').click();
    await expect(pagina.getByTestId('correo-enviado')).toContainText('Si tu usuario tiene un correo verificado');
    const reenviar = pagina.getByTestId('correo-reenviar');
    await expect(reenviar).toBeDisabled();
    await pagina.clock.fastForward(61_000);
    await expect(reenviar).toBeEnabled();
    const respuesta = pagina.waitForResponse((r) => r.url().endsWith('/recuperar-por-correo/solicitar'));
    await reenviar.click();
    expect((await respuesta).status()).toBe(202);
    await expect(reenviar).toBeDisabled();
    await expect(pagina.getByTestId('correo-enviar')).toBeDisabled();
    await pagina.getByTestId('correo-codigo').fill('123456');
    await pagina.getByTestId('correo-clave').fill('ClaveNueva-2026');
    await pagina.getByTestId('correo-clave-repetir').fill('ClaveNueva-2026');
    await pagina.getByTestId('correo-enviar').click();
    await expect(pagina.getByTestId('correo-error')).toContainText('incorrectos');
    await anonimo.close();
  } finally {
    // Deja el envío apagado para las demás pruebas.
    await api(page, 'put', '/auth/envio-correo', { url_envio: null });
  }
});

const pruebaBatch = test.extend({ serviceWorkers: 'block' });

pruebaBatch('horno batch: un solo registro por orden con baches y litros de aceite', async ({ page }) => {
  await entrar(page);
  await expect(page).toHaveURL(/\/inicio/);

  const lineas = await api<(ConId & { codigo: string })[]>(page, 'get', '/catalogos/lineas');
  const nachos = lineas.find((l) => l.codigo === 'nachos')!;
  const turnos = await api<ConId[]>(page, 'get', '/catalogos/turnos');
  const categoria = await api<ConId>(page, 'post', '/catalogos/categorias', {
    nombre: `Nachos E2E ${SUFIJO}`,
    activo: true,
  });
  const horno = await api<ConId & { tipo: string }>(page, 'post', '/catalogos/hornos', {
    nombre: `Batch Nachos ${SUFIJO}`,
    activo: true,
    apto_exportacion: false,
    linea_id: nachos.id,
    tipo: 'batch',
    capacidad_kg_hora: 200,
    categoria_ids: [categoria.id],
  });
  expect(horno.tipo).toBe('batch');
  const producto = await api<ConId>(page, 'post', '/catalogos/productos', {
    nombre_comercial: `Nacho E2E ${SUFIJO}`,
    categoria_id: categoria.id,
    activo: true,
    destino: 'ambos',
    sabor_minimo_pct: 1.5,
    sabor_maximo_pct: 2.5,
  });

  let ordenId: number | null = null;
  try {
    const orden = await api<ConId>(page, 'post', '/ordenes', {
      turno_id: turnos[0].id,
      horno_id: horno.id,
      categoria_id: categoria.id,
      producto_id: producto.id,
      destino: 'nacional',
      unidad_solicitada: 'kg',
      cantidad_kg: 300,
      horas_produccion: 2,
    });
    ordenId = orden.id;
    await api(page, 'post', `/ordenes/${ordenId}/iniciar`);

    await page.goto('/horno');
    await expect(page.getByTestId(`registrar-tanda-${ordenId}`)).toContainText('Abrir registro de producción');

    await page.goto(`/horno/${ordenId}`);
    await expect(page.getByTestId('paso-horario')).toContainText('toda la orden');
    await page.getByTestId('continuar-horno').click();

    await expect(page.getByTestId('paso-kg_materia')).toBeVisible();
    for (const tecla of ['3', '0', '0']) await page.getByTestId(`tecla-${tecla}`).click();
    await page.getByTestId('continuar-horno').click();

    await expect(page.getByTestId('paso-baches')).toBeVisible();
    for (const tecla of ['1', '2']) await page.getByTestId(`tecla-${tecla}`).click();
    await page.getByTestId('continuar-horno').click();

    await expect(page.getByTestId('paso-temperatura')).toBeVisible();
    await page.getByTestId('temperatura-180').click();
    await page.getByTestId('continuar-horno').click();
    await page.getByTestId('personal-zona-5').click();
    await page.getByTestId('continuar-horno').click();
    await page.getByTestId('personal-seleccion-5').click();
    await page.getByTestId('continuar-horno').click();

    // Sin nivel en cm: solo los litros que se agregaron.
    await expect(page.getByTestId('paso-aceite_litros')).toBeVisible();
    for (const tecla of ['4', '0']) await page.getByTestId(`tecla-${tecla}`).click();
    await page.getByTestId('continuar-horno').click();

    await expect(page.getByTestId('paso-desperdicio')).toBeVisible();
    await page.getByTestId('sin-desperdicio').click();

    await expect(page.getByTestId('paso-resumen')).toBeVisible();
    await expect(page.getByTestId('resumen-baches')).toContainText('12');
    await page.getByTestId('guardar-tanda').click();
    await expect(page).toHaveURL(/\/horno$/);

    const detalle = await api<{
      registros_horno: {
        cantidad_baches: number;
        nivel_aceite_inicial_cm: string | null;
        volumen_aceite_litros: string | null;
      }[];
    }>(page, 'get', `/ordenes/${ordenId}`);
    expect(detalle.registros_horno).toHaveLength(1);
    expect(detalle.registros_horno[0].cantidad_baches).toBe(12);
    expect(detalle.registros_horno[0].nivel_aceite_inicial_cm).toBeNull();
    expect(Number(detalle.registros_horno[0].volumen_aceite_litros)).toBe(40);

    // Una sola vez por orden.
    await page.goto(`/horno/${ordenId}`);
    await expect(page.getByTestId('horno-orden-completa')).toBeVisible();
    await page.getByRole('button', { name: 'Corregir registro' }).click();
    const baches = page.getByLabel('Cantidad de baches');
    const litros = page.getByLabel('Aceite agregado (L)');
    const guardar = page.getByRole('button', { name: 'Guardar corrección' });
    await expect(baches).toHaveValue('12');
    await expect(litros).toHaveValue('40');
    await expect(guardar).toBeDisabled();
    await baches.fill('0');
    await guardar.click();
    await expect(baches).toBeFocused();

    // El contrato HTTP real se verifica con PostgreSQL en el CI del backend.
    // Aquí se controla el conflicto para verificar la recuperación desde la pantalla.
    await page.route('**/registros-horno/*/batch', (ruta) => ruta.fulfill({ status: 409, json: {} }));
    await baches.fill('14');
    await guardar.click();
    await expect(page.getByText('Otra persona corrigió el registro.', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Cargar registro actual' }).click();
    await page.getByRole('button', { name: 'Corregir registro' }).click();
    await expect(baches).toHaveValue('12');
    await page.unroute('**/registros-horno/*/batch');
    await page.route('**/registros-horno/*/batch', async (ruta) => {
      expect(ruta.request().method()).toBe('PATCH');
      expect(ruta.request().postDataJSON()).toEqual({
        anterior: { cantidad_baches: 12, aceite_agregado_litros: 40 },
        nuevo: { cantidad_baches: 14, aceite_agregado_litros: 42.5 },
      });
      await ruta.fulfill({ json: { ...detalle.registros_horno[0], cantidad_baches: 14, aceite_agregado_litros: '42.50' } });
    });
    await baches.fill('14');
    await litros.fill('42.5');
    await guardar.click();
    await expect(page.getByText('Corrección guardada.')).toBeVisible();
    await expect(page.getByText('14 baches · 42.50 L de aceite')).toBeVisible();
  } finally {
    if (ordenId) {
      await page.request.post(`/api/v1/ordenes/${ordenId}/cancelar`);
      await page.request.delete(`/api/v1/ordenes/${ordenId}`);
    }
    await api(page, 'put', `/catalogos/hornos/${horno.id}`, {
      nombre: `Batch Nachos ${SUFIJO}`,
      activo: false,
      apto_exportacion: false,
      linea_id: nachos.id,
      categoria_ids: [categoria.id],
    });
  }
});
