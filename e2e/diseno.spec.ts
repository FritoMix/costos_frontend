import { expect, test } from '@playwright/test';
import type { Indicadores } from '../src/app/core/modelos/analitica.model';

// Datos ficticios: esta revisión de geometría no escribe en la API.
const categoria={id:1,nombre:'Papa Hojuela',activo:true};
const user={id:1,nombre_completo:'Operador de Pruebas de Fritomix',nombre_usuario:'operador_visual',activo:true,fecha_creacion:'2026-11-14',rol:{id:1,codigo:'admin',nombre:'Administrador'}};
const horno={id:1,nombre:'Horno de producción de papa',activo:true,tipo_aceite:'Palma',apto_exportacion:true,tanque_diametro_cm:100,litros_por_cm_manual:null,litros_por_cm:7.85,capacidad_bultos_hora:50,categorias:[categoria]};
const producto={id:1,nombre_comercial:'Papa Hojuela Natural',activo:true,peso_estandar_canastilla_kg:6,categoria};
const refs=[{id:1,nombre:'Papa de prueba',tipo:null,peso_promedio_bulto_kg:45,rendimiento_fritura_pct:null,porcentaje_produccion_pct:null,activo:true,fecha_creacion:'2026-11-14',fecha_actualizacion:'2026-11-14'}];
const usuarioPlanta = { ...user, id: 2, nombre_usuario: 'operaria_prueba', nombre_completo: 'Operaria de la línea de producción de la tarde' };
const orden = {
  id: 1, numero_orden: 'ORD-123456', horno, categoria, producto, turno: { nombre: 'Tarde' },
  cantidad_programada: 1250, horas_produccion: 8, estado: 'en_produccion',
};
async function mock(route: import('@playwright/test').Route){const u=new URL(route.request().url());let data: unknown = [];
if(u.pathname.endsWith('/auth/yo'))data=user;
else if(u.pathname.endsWith('/notificaciones/pendientes'))data={sin_leer:0,pendientes:[]};
else if(u.pathname.endsWith('/catalogos/hornos'))data=[horno];
else if(u.pathname.endsWith('/catalogos/productos'))data=[producto];
else if(u.pathname.endsWith('/catalogos/categorias'))data=[categoria];
else if(u.pathname.endsWith('/catalogos/turnos'))data=[{id:1,nombre:'Mañana',hora_inicio:'06:00',hora_fin:'14:00',activo:true,cruza_medianoche:false}];
else if(u.pathname.endsWith('/bodega/referencias-papa'))data=refs;
else if(u.pathname.endsWith('/bodega/proyeccion'))data={horno_id:1,horno_nombre:horno.nombre,capacidad_bultos_hora:50,horas:1,total_bultos:50,total_kg_crudos:2250,total_kg_fritos_estimados:null,referencias:[]};
else if(u.pathname.endsWith('/catalogos/configuracion'))data={peso_estandar_bulto_kg:45,peso_estandar_canastilla_kg:6};
else if(u.pathname.endsWith('/ordenes'))data=u.searchParams.get('estado') === 'pendiente' ? [] : [orden];
else if(u.pathname.endsWith('/ordenes/1'))data={orden,totales:{},formula:null,registros_horno:[],recepciones:[]};
else if(u.pathname.endsWith('/ordenes/resumen-inicio'))data={activas:[],pendientes_sin_formula:0};
else if(u.pathname.endsWith('/usuarios') || u.pathname.endsWith('/usuarios/para-recuperar'))data=[usuarioPlanta];
else if(u.pathname.endsWith('/password-temporal'))data={password_temporal:'01234567'};
else if(u.pathname.endsWith('/analitica/indicadores')) {
  data = {
    numero_ordenes: 0, kg_crudos: 0, cantidad_bultos: 0, kg_papa_frita: 0,
    kg_sabor: 0, kg_desperdicio: 0, kg_aceite: 0, aceite_por_bulto: null,
    rendimiento_porcentaje: null, porcentaje_absorcion_aceite: null,
    por_horno: [], por_producto: [], por_turno: [], por_tipo_desperdicio: [],
  } satisfies Indicadores;
}
else if(u.pathname.endsWith('/baches/pagina'))data={items:[],hay_siguiente:false};
else if(u.pathname.endsWith('/ordenes/pagina'))data={items:[],total:0,pagina:1,tamano:50};
else if(u.pathname.endsWith('/auth/actividad'))data={};
await route.fulfill({status:200,contentType:'application/json',headers:{'X-Sesion-Inactividad-Segundos':'1800'},body:JSON.stringify(data)});}


test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });
for (const width of [320, 390, 768, 1024, 1366]) {
  test(`secciones separadas y contenido adaptable a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/v1/**', mock);
    for (const [nombre, url] of [
      ['inicio', '/inicio'],
      ['ordenes', '/ordenes'],
      ['analisis', '/analisis'],
      ['catalogos', '/catalogos'],
      ['recuperar', '/recuperar-clave'],
      ['cuenta', '/mi-cuenta'],
      ['bodega', '/bodega'],
      ['hornos', '/catalogos/hornos'],
      ['productos', '/catalogos/productos'],
      ['formulas', '/formula-produccion?seccion=ordenes'],
    ]) {
      await page.goto(url);
      await expect(page.locator('main h1').first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: testInfo.outputPath(`diseno-${nombre}-${width}.png`), fullPage: true, animations: 'disabled' });
      const medidas = await page.evaluate(() => ({
        exceso: document.documentElement.scrollWidth - innerWidth,
        tarjetas: [...document.querySelectorAll('app-tarjeta')].map(e => {
          const rect = e.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, alto: rect.height, display: getComputedStyle(e).display };
        }),
      }));
      expect(medidas.exceso, `${nombre}: sin desplazamiento horizontal de toda la página`).toBeLessThanOrEqual(1);
      for (const tarjeta of medidas.tarjetas) {
        expect(tarjeta.display).toBe('block');
        expect(tarjeta.alto).toBeGreaterThan(0);
      }
      if (nombre === 'cuenta') {
        // Identidad y contraseña; el administrador ve además sus códigos de recuperación.
        expect(medidas.tarjetas.length).toBe(3);
        for (let i = 1; i < medidas.tarjetas.length; i++) {
          expect(medidas.tarjetas[i].top - medidas.tarjetas[i - 1].bottom).toBeGreaterThanOrEqual(23);
        }
      }
    }
  });
}

for (const width of [320, 390, 768, 1366]) {
  test(`tarjetas de operación, horario y contraseña temporal a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.route('**/api/v1/**', mock);
    for (const estacion of ['horno', 'saborizado']) {
      await page.goto('/' + estacion);
      const tarjeta = page.getByTestId(estacion + '-orden-1');
      await expect(tarjeta).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const rect = (await tarjeta.boundingBox())!;
      expect(Math.abs(rect.x + rect.width / 2 - width / 2)).toBeLessThan(2);
      await tarjeta.getByRole('link').click();
      const horario = page.getByTestId('paso-horario');
      await expect(horario).toBeVisible();
      for (const texto of ['Inicio', 'Fin']) {
        const grupo = horario.getByText(texto, { exact: true }).locator('..');
        const caja = (await grupo.boundingBox())!;
        expect(caja.x).toBeGreaterThanOrEqual(0);
        expect(caja.x + caja.width).toBeLessThanOrEqual(width);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    }
    await page.goto('/usuarios');
    await page.getByTestId('clave-temporal-operaria_prueba').click();
    const confirmar = page.getByRole('dialog', { name: /Dar contraseña temporal/ });
    await expect(confirmar).toBeInViewport({ ratio: 1 });
    await confirmar.getByRole('button', { name: 'Sí, generar' }).click();
    const resultado = page.getByRole('dialog', { name: 'Contraseña temporal generada' });
    await expect(resultado).toBeInViewport({ ratio: 1 });
    await expect(resultado.getByTestId('clave-temporal-valor')).toHaveText('01234567');
    expect(await resultado.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    await resultado.getByRole('button', { name: 'Listo, ya la dicté' }).click();
    await expect(resultado).toHaveCount(0);
    await page.getByRole('button', { name: /Avisos:/ }).click();
    await expect(page.getByText('Avisos de planta', { exact: true })).toBeInViewport({ ratio: 1 });
  });
}
