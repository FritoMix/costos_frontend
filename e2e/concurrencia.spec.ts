import { randomUUID } from 'node:crypto';
import { test, expect, type APIRequestContext, type BrowserContext } from '@playwright/test';

const API = '/api/v1';
const USER = process.env['E2E_ADMIN_USER'] || 'admin';
const PASS = process.env['E2E_ADMIN_PASS'] || '';

interface Catalogo {
  id: number;
  nombre: string;
  activo: boolean;
}
interface Producto {
  id: number;
  nombre_comercial: string;
  categoria: Catalogo;
}
interface Equipo extends Catalogo {
  categorias: Catalogo[];
}
interface Orden {
  id: number;
  horno: { id: number };
  estado: string;
}

async function login(ctx: APIRequestContext, usuario = USER, password = PASS) {
  const respuesta = await ctx.post(`${API}/auth/login`, {
    data: { nombre_usuario: usuario, password },
  });
  expect(respuesta.status()).toBe(200);
}

async function datos(ctx: APIRequestContext) {
  const productos = (await (await ctx.get(`${API}/catalogos/productos`)).json()) as Producto[];
  const producto = productos.find((p) => p.nombre_comercial === 'Producto E2E')!;
  expect(producto).toBeTruthy();
  const hornos = (await (await ctx.get(`${API}/catalogos/hornos`)).json()) as Equipo[];
  const horno = hornos.find(
    (h) => h.activo && h.categorias.some((c) => c.id === producto.categoria.id),
  )!;
  expect(horno).toBeTruthy();
  const turnos = (await (await ctx.get(`${API}/catalogos/turnos`)).json()) as Catalogo[];
  return {
    turno_id: turnos.find((t) => t.activo)!.id,
    horno_id: horno.id,
    categoria_id: producto.categoria.id,
    producto_id: producto.id,
    destino: 'nacional',
    unidad_solicitada: 'kg',
    cantidad_kg: 100,
    horas_produccion: 1,
  };
}

async function crear(ctx: APIRequestContext, cuerpo: Awaited<ReturnType<typeof datos>>) {
  const respuesta = await ctx.post(`${API}/ordenes`, { data: cuerpo });
  expect(respuesta.status()).toBe(201);
  return respuesta.json() as Promise<Orden>;
}

async function limpiar(ctx: APIRequestContext, ids: Set<number>) {
  for (const id of ids) {
    await ctx.post(`${API}/ordenes/${id}/cancelar`);
    const respuesta = await ctx.delete(`${API}/ordenes/${id}`);
    expect([204, 404]).toContain(respuesta.status());
  }
}

test.describe('Concurrencia en PostgreSQL y experiencia de operarios', () => {
  test.use({ serviceWorkers: 'block' });
  test.beforeAll(async ({ baseURL }) => {
    const url = new URL(baseURL || 'http://localhost:3000');
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.protocol !== 'http:') {
      throw new Error('Pruebas simultáneas bloqueadas: requieren el stack local desechable.');
    }
    if (!PASS) throw new Error('Falta E2E_ADMIN_PASS para el entorno ficticio.');
  });

  test('dos operarios no pueden ocupar el mismo horno con órdenes diferentes', async ({
    browser,
    request,
    baseURL,
  }, info) => {
    await login(request);
    const cuerpo = await datos(request);
    const roles = (await (await request.get(`${API}/usuarios/roles`)).json()) as {
      id: number;
      codigo: string;
    }[];
    const rol = roles.find((r) => r.codigo === 'operario_horno')!;
    expect(rol).toBeTruthy();
    const contextos: BrowserContext[] = [];
    const ids = new Set<number>();
    let fallo = true;
    try {
      for (let i = 0; i < 2; i++) {
        const usuario = `sim_horno_${randomUUID().slice(0, 8)}`;
        const password = `Prueba-${randomUUID()}`;
        const creado = await request.post(`${API}/usuarios`, {
          data: {
            nombre_usuario: usuario,
            nombre_completo: `Operario ficticio ${i + 1}`,
            rol_id: rol.id,
            password,
            activo: true,
          },
        });
        expect(creado.status()).toBe(201);
        const contexto = await browser.newContext({ baseURL, serviceWorkers: 'block' });
        contextos.push(contexto);
        await contexto.tracing.start({ screenshots: true, snapshots: true });
        await login(contexto.request, usuario, password);
      }
      for (let ronda = 0; ronda < 3; ronda++) {
        const a = await crear(request, cuerpo);
        const b = await crear(request, cuerpo);
        ids.add(a.id);
        ids.add(b.id);
        const paginas = await Promise.all(contextos.map((c) => c.newPage()));
        await Promise.all(paginas.map((p) => p.goto('/horno')));
        await expect(paginas[0].getByTestId(`tomar-orden-${a.id}`)).toBeEnabled();
        await expect(paginas[1].getByTestId(`tomar-orden-${b.id}`)).toBeEnabled();
        let llegaron = 0;
        let liberar!: () => void;
        const barrera = new Promise<void>((resolve) => {
          liberar = resolve;
        });
        for (const pagina of paginas) {
          await pagina.route('**/api/v1/ordenes/*/iniciar', async (ruta) => {
            llegaron++;
            if (llegaron === 2) liberar();
            await barrera;
            await ruta.continue();
          });
        }
        const respuestas = paginas.map((p) =>
          p.waitForResponse(
            (r) => r.request().method() === 'POST' && r.url().endsWith('/iniciar'),
            { timeout: 15_000 },
          ),
        );
        await Promise.all([
          paginas[0].getByTestId(`tomar-orden-${a.id}`).click(),
          paginas[1].getByTestId(`tomar-orden-${b.id}`).click(),
        ]);
        const resultados = await Promise.all(respuestas);
        const estados = resultados.map((r) => r.status());
        expect(estados.filter((e) => e === 200)).toHaveLength(1);
        expect(estados.filter((e) => [400, 409].includes(e))).toHaveLength(1);
        const ganadora = estados[0] === 200 ? a.id : b.id;
        const perdedora = estados[0] === 200 ? paginas[1] : paginas[0];
        await expect(perdedora.getByRole('status')).toContainText('No se confirmó');
        await expect(perdedora.getByTestId(`registrar-tanda-${ganadora}`)).toBeVisible();
        const activas = (await (
          await request.get(`${API}/ordenes?estado=en_produccion&solo_propias=false`)
        ).json()) as Orden[];
        expect(activas.filter((o) => o.horno.id === cuerpo.horno_id)).toHaveLength(1);
        await limpiar(request, new Set([a.id, b.id]));
        ids.delete(a.id);
        ids.delete(b.id);
        await Promise.all(paginas.map((p) => p.close()));
      }
      fallo = false;
    } finally {
      try {
        await limpiar(request, ids);
      } finally {
        for (let i = 0; i < contextos.length; i++) {
          if (fallo) {
            const path = info.outputPath(`operario-${i}.zip`);
            await contextos[i].tracing.stop({ path });
            await info.attach(`Operario ${i}`, { path, contentType: 'application/zip' });
          } else await contextos[i].tracing.stop();
          await contextos[i].close();
        }
      }
    }
  });

  test('ocho reintentos simultáneos crean una sola orden, tanda y recepción', async ({
    request,
  }) => {
    await login(request);
    const cuerpo = await datos(request);
    const ids = new Set<number>();
    try {
      const repetidos = async (ruta: string, data: unknown) => {
        const clave = randomUUID();
        const respuestas = await Promise.all(
          Array.from({ length: 8 }, () =>
            request.post(ruta, {
              data,
              headers: { 'Idempotency-Key': clave },
            }),
          ),
        );
        for (const respuesta of respuestas) expect(respuesta.status()).toBe(201);
        const objetos = (await Promise.all(respuestas.map((r) => r.json()))) as { id: number }[];
        expect(new Set(objetos.map((o) => o.id)).size).toBe(1);
        return objetos[0].id;
      };
      const ordenId = await repetidos(`${API}/ordenes`, cuerpo);
      ids.add(ordenId);
      expect((await request.post(`${API}/ordenes/${ordenId}/iniciar`)).status()).toBe(200);
      const detalle = await (await request.get(`${API}/ordenes/${ordenId}`)).json();
      const referencias = detalle.formula.referencias.map(
        (r: { referencia_id: number; bultos_por_tanda: number }) => ({
          referencia_papa_id: r.referencia_id,
          cantidad_bultos: r.bultos_por_tanda,
        }),
      );
      expect(referencias.length).toBeGreaterThan(0);
      await repetidos(`${API}/ordenes/${ordenId}/registros-horno`, {
        hora_inicio: '08:00',
        hora_fin: '09:00',
        referencias,
        operarios_seleccion: 5,
        operarios_horno: 5,
        nivel_aceite_inicial_cm: 50,
        nivel_aceite_final_cm: 45,
        temperatura_aceite_c: 180,
      });
      const sabores = (await (await request.get(`${API}/catalogos/sabores`)).json()) as Catalogo[];
      await repetidos(`${API}/ordenes/${ordenId}/recepciones`, {
        hora_inicio: '08:00',
        hora_fin: '09:00',
        sabor_id: sabores.find((s) => s.activo)!.id,
        cantidad_sabor_kg: 2,
        pesos_canastillas: [25],
      });
      const final = await (await request.get(`${API}/ordenes/${ordenId}`)).json();
      expect(final.registros_horno).toHaveLength(1);
      expect(final.recepciones).toHaveLength(1);
      expect(Number(final.totales.kg_papa_frita)).toBe(25);
    } finally {
      await limpiar(request, ids);
    }
  });
});
