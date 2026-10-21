import { request } from '@playwright/test';

/**
 * Limpieza posterior al E2E.
 *
 * El seed crea o reactiva "Papa E2E" con 100 % de participacion para poder
 * registrar una tanda. Si quedara activa en una base de desarrollo, se
 * sumaria a las referencias reales (por ejemplo 100 % + 45 %) y la
 * proyeccion de Bodega responderia 400. Al terminar la suite se desactiva:
 * el historico de tandas que la referencian se conserva.
 */

const BASE_URL = process.env['E2E_BASE_URL'] || 'http://localhost:3000';
const USUARIO = process.env['E2E_ADMIN_USER'] || 'admin';
const PASSWORD = process.env['E2E_ADMIN_PASS'] || '';
const REFERENCIA_PAPA = 'Papa E2E';

interface ReferenciaPapa {
  id: number;
  nombre: string;
  tipo: string | null;
  peso_promedio_bulto_kg: number;
  rendimiento_fritura_pct: number | null;
  porcentaje_produccion_pct: number | null;
  activo: boolean;
}

export default async function globalTeardown(): Promise<void> {
  if (!PASSWORD) {
    return;
  }

  const ctx = await request.newContext({ baseURL: BASE_URL });

  try {
    const login = await ctx.post('/api/v1/auth/login', {
      data: { nombre_usuario: USUARIO, password: PASSWORD },
    });
    if (!login.ok()) {
      console.warn(`E2E teardown: no se pudo iniciar sesión (${login.status()}).`);
      return;
    }

    const respuesta = await ctx.get('/api/v1/bodega/referencias-papa?solo_activas=false');
    if (!respuesta.ok()) {
      console.warn(`E2E teardown: no se pudieron leer las referencias (${respuesta.status()}).`);
      return;
    }

    const referencias = (await respuesta.json()) as ReferenciaPapa[];
    const referencia = referencias.find((r) => r.nombre === REFERENCIA_PAPA);
    if (!referencia?.activo) {
      return;
    }

    const desactivar = await ctx.put(`/api/v1/bodega/referencias-papa/${referencia.id}`, {
      data: {
        nombre: referencia.nombre,
        tipo: referencia.tipo,
        peso_promedio_bulto_kg: Number(referencia.peso_promedio_bulto_kg),
        rendimiento_fritura_pct:
          referencia.rendimiento_fritura_pct === null
            ? null
            : Number(referencia.rendimiento_fritura_pct),
        porcentaje_produccion_pct:
          referencia.porcentaje_produccion_pct === null
            ? null
            : Number(referencia.porcentaje_produccion_pct),
        activo: false,
      },
    });

    if (!desactivar.ok()) {
      console.warn(
        `E2E teardown: no se pudo desactivar "${REFERENCIA_PAPA}" (${desactivar.status()}).`,
      );
      return;
    }

    console.log(`E2E teardown OK: referencia "${REFERENCIA_PAPA}" desactivada.`);
  } finally {
    await ctx.dispose();
  }
}
