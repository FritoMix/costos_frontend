import { expect, test } from '@playwright/test';

// Datos ficticios: esta revisión de geometría no escribe en la API.
const categoria={id:1,nombre:'Papa Hojuela',activo:true};
const user={id:1,nombre_completo:'Operador de Pruebas de Fritomix',nombre_usuario:'operador_visual',activo:true,fecha_creacion:'2026-11-14',rol:{id:1,codigo:'admin',nombre:'Administrador'}};
const horno={id:1,nombre:'Horno de producción de papa',activo:true,tipo_aceite:'Palma',apto_exportacion:true,tanque_diametro_cm:100,litros_por_cm_manual:null,litros_por_cm:7.85,capacidad_bultos_hora:50,categorias:[categoria]};
const producto={id:1,nombre_comercial:'Papa Hojuela Natural',activo:true,peso_estandar_canastilla_kg:6,categoria};
const refs=[{id:1,nombre:'Papa de prueba',tipo:null,peso_promedio_bulto_kg:45,rendimiento_fritura_pct:null,porcentaje_produccion_pct:null,activo:true,fecha_creacion:'2026-11-14',fecha_actualizacion:'2026-11-14'}];
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
else if(u.pathname.endsWith('/ordenes/pagina'))data={items:[],total:0,pagina:1,tamano:50};
else if(u.pathname.endsWith('/auth/actividad'))data={};
await route.fulfill({status:200,contentType:'application/json',headers:{'X-Sesion-Inactividad-Segundos':'1800'},body:JSON.stringify(data)});}


test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });
for (const width of [320, 390, 1024, 1366]) {
  test(`secciones separadas y contenido adaptable a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/v1/**', mock);
    for (const [nombre, url] of [
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
        expect(medidas.tarjetas.length).toBe(2);
        expect(medidas.tarjetas[1].top - medidas.tarjetas[0].bottom).toBeGreaterThanOrEqual(23);
      }
    }
  });
}
