import { request, type APIRequestContext } from '@playwright/test';

/**
 * Preparación idempotente del E2E.
 *
 * Se ejecuta una sola vez antes de la suite y deja la base en un estado
 * conocido:
 *   - valida que E2E_ADMIN_PASS exista (las credenciales NO van en el código);
 *   - crea el producto "Producto E2E" y un sabor si la base está vacía;
 *   - borra órdenes E2E que hayan quedado colgadas de una corrida anterior.
 *
 * Todo se hace por la API pública, con la misma sesión de administrador que
 * usará el navegador. Así el seed también sirve contra Docker o staging.
 */

const BASE_URL = process.env['E2E_BASE_URL'] || 'http://localhost:3000';
const USUARIO = process.env['E2E_ADMIN_USER'] || 'admin';
const PASSWORD = process.env['E2E_ADMIN_PASS'] || '';

const CATEGORIA = process.env['E2E_CATEGORIA'] || 'Papa Hojuela';
const PRODUCTO = 'Producto E2E';
const SABOR = 'Sabor E2E';
const REFERENCIA_PAPA = 'Papa E2E';

interface Catalogo {
  id: number;
  nombre: string;
  activo: boolean;
}

interface Producto {
  id: number;
  nombre_comercial: string;
  activo: boolean;
  categoria: Catalogo;
}

interface Horno extends Catalogo {
  categorias: Catalogo[];
  capacidad_bultos_hora: number | null;
}

interface ReferenciaPapa {
  id: number;
  nombre: string;
  tipo: string | null;
  peso_promedio_bulto_kg: number;
  rendimiento_fritura_pct: number | null;
  porcentaje_produccion_pct: number | null;
  activo: boolean;
}

type OpcionesFetch = NonNullable<Parameters<APIRequestContext['fetch']>[1]>;

async function api<T>(
  ctx: APIRequestContext,
  ruta: string,
  opciones: OpcionesFetch = {},
): Promise<T> {
  const respuesta = await ctx.fetch(`/api/v1${ruta}`, opciones);
  if (!respuesta.ok()) {
    const detalle = await respuesta.text();
    throw new Error(
      `E2E seed: ${opciones.method || 'GET'} ${ruta} -> ${respuesta.status()} ${detalle}`,
    );
  }
  return (await respuesta.json()) as T;
}

async function iniciarSesion(ctx: APIRequestContext): Promise<void> {
  if (!PASSWORD) {
    throw new Error(
      'Falta E2E_ADMIN_PASS. Expórtala antes de correr Playwright, por ejemplo:\n' +
        '  E2E_ADMIN_PASS="tu-contraseña" npm run test:e2e',
    );
  }

  const respuesta = await ctx.post('/api/v1/auth/login', {
    data: { nombre_usuario: USUARIO, password: PASSWORD },
  });
  if (!respuesta.ok()) {
    throw new Error(
      `E2E seed: no se pudo iniciar sesión como "${USUARIO}" (${respuesta.status()}). ` +
        'Revisa E2E_ADMIN_USER / E2E_ADMIN_PASS.',
    );
  }
}

async function limpiarOrdenesAnteriores(ctx: APIRequestContext): Promise<number> {
  let eliminadas = 0;
  for (const estado of ['pendiente', 'en_produccion']) {
    const ordenes = await api<Array<{ id: number; producto: { nombre_comercial: string } }>>(
      ctx,
      `/ordenes?estado=${estado}`,
    );
    for (const orden of ordenes) {
      if (orden.producto.nombre_comercial !== PRODUCTO) {
        continue;
      }
      // Cancelar primero libera el horno aunque la API todavía no tenga el
      // arreglo que cierra la orden al borrarla.
      await ctx.post(`/api/v1/ordenes/${orden.id}/cancelar`);
      const borrado = await ctx.delete(`/api/v1/ordenes/${orden.id}`);
      if (!borrado.ok()) {
        throw new Error(`E2E seed: no se pudo borrar la orden ${orden.id} (${borrado.status()}).`);
      }
      eliminadas += 1;
    }
  }
  return eliminadas;
}

async function asegurarProducto(ctx: APIRequestContext, categoria: Catalogo): Promise<Producto> {
  const productos = await api<Producto[]>(ctx, '/catalogos/productos?solo_activos=false');
  const existente = productos.find((p) => p.nombre_comercial === PRODUCTO);

  if (existente) {
    if (existente.activo && existente.categoria.id === categoria.id) {
      return existente;
    }
    return api<Producto>(ctx, `/catalogos/productos/${existente.id}`, {
      method: 'PUT',
      data: {
        nombre_comercial: PRODUCTO,
        categoria_id: categoria.id,
        activo: true,
        peso_estandar_canastilla_kg: 6,
      },
    });
  }

  return api<Producto>(ctx, '/catalogos/productos', {
    method: 'POST',
    data: {
      nombre_comercial: PRODUCTO,
      categoria_id: categoria.id,
      activo: true,
      peso_estandar_canastilla_kg: 6,
    },
  });
}

async function asegurarSabor(ctx: APIRequestContext): Promise<void> {
  const sabores = await api<Catalogo[]>(ctx, '/catalogos/sabores?solo_activos=true');
  if (sabores.length > 0) {
    return;
  }
  await api<Catalogo>(ctx, '/catalogos/sabores', {
    method: 'POST',
    data: { nombre: SABOR, activo: true },
  });
}

async function asegurarReferenciaPapa(ctx: APIRequestContext): Promise<ReferenciaPapa> {
  const referencias = await api<ReferenciaPapa[]>(
    ctx,
    '/bodega/referencias-papa?solo_activas=false',
  );
  const existente = referencias.find((r) => r.nombre === REFERENCIA_PAPA);

  const datos = {
    nombre: REFERENCIA_PAPA,
    tipo: 'Papa pareja',
    peso_promedio_bulto_kg: 50,
    rendimiento_fritura_pct: 25,
    porcentaje_produccion_pct: 100,
    activo: true,
  };

  if (existente) {
    if (
      existente.activo &&
      existente.tipo === datos.tipo &&
      Number(existente.peso_promedio_bulto_kg) === 50 &&
      Number(existente.rendimiento_fritura_pct) === 25 &&
      Number(existente.porcentaje_produccion_pct) === 100
    ) {
      return existente;
    }
    return api<ReferenciaPapa>(ctx, `/bodega/referencias-papa/${existente.id}`, {
      method: 'PUT',
      data: datos,
    });
  }

  return api<ReferenciaPapa>(ctx, '/bodega/referencias-papa', {
    method: 'POST',
    data: datos,
  });
}

async function asegurarCapacidadHorno(ctx: APIRequestContext, horno: Horno): Promise<void> {
  if (Number(horno.capacidad_bultos_hora) === 50) {
    return;
  }
  await api<Horno>(ctx, `/catalogos/hornos/${horno.id}/capacidad`, {
    method: 'PATCH',
    data: { capacidad_bultos_hora: 50 },
  });
}

async function asegurarConfiguracion(ctx: APIRequestContext): Promise<void> {
  const config = await api<{ peso_estandar_bulto_kg: number | null }>(
    ctx,
    '/catalogos/configuracion',
  );
  if (config.peso_estandar_bulto_kg !== null && Number(config.peso_estandar_bulto_kg) > 0) {
    return;
  }
  await api(ctx, '/catalogos/configuracion', {
    method: 'PUT',
    data: { peso_estandar_bulto_kg: 50, peso_estandar_canastilla_kg: 6 },
  });
}

export default async function globalSetup(): Promise<void> {
  const ctx = await request.newContext({ baseURL: BASE_URL });

  try {
    await iniciarSesion(ctx);

    const categorias = await api<Catalogo[]>(ctx, '/catalogos/categorias?solo_activas=true');
    const categoria = categorias.find((c) => c.nombre === CATEGORIA);
    if (!categoria) {
      throw new Error(
        `E2E seed: no existe la categoría "${CATEGORIA}". ` +
          'Cambia E2E_CATEGORIA o carga los datos iniciales de las migraciones.',
      );
    }

    const hornos = await api<Horno[]>(ctx, '/catalogos/hornos?solo_activos=true');
    const hornoCompatible = hornos.find((h) => h.categorias.some((c) => c.id === categoria.id));
    if (!hornoCompatible) {
      throw new Error(
        `E2E seed: ningún horno activo produce la categoría "${CATEGORIA}". ` +
          'Revisa Catálogos › Hornos.',
      );
    }

    const turnos = await api<Catalogo[]>(ctx, '/catalogos/turnos?solo_activos=true');
    if (turnos.length === 0) {
      throw new Error('E2E seed: no hay turnos activos.');
    }

    await asegurarConfiguracion(ctx);
    await asegurarSabor(ctx);
    await asegurarProducto(ctx, categoria);
    await asegurarCapacidadHorno(ctx, hornoCompatible);
    const referencia = await asegurarReferenciaPapa(ctx);
    const limpiadas = await limpiarOrdenesAnteriores(ctx);

    console.log(
      `E2E seed OK: categoría "${CATEGORIA}", horno "${hornoCompatible.nombre}", ` +
        `producto "${PRODUCTO}", referencia "${referencia.nombre}", ` +
        `órdenes E2E limpiadas: ${limpiadas}.`,
    );
  } finally {
    await ctx.dispose();
  }
}
