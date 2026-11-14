# Concurrencia y experiencia operativa

Estas pruebas solo se ejecutan contra el stack HTTP local desechable de E2E.
El archivo `e2e/concurrencia.spec.ts` rechaza destinos externos; no requiere
credenciales de producción ni carga Supabase o Render. No confundir el único
worker de Playwright con una única solicitud: los casos abren navegadores y
peticiones simultáneas de forma explícita dentro de cada prueba.

## Casos reproducibles

- Dos cuentas distintas de operario de horno, cada una con su navegador y sesión,
  intentan iniciar órdenes diferentes para el mismo horno. Una barrera de red
  libera ambas peticiones juntas. Se repite tres veces. Solo una debe iniciar;
  la otra ve un aviso y la lista actualizada desde la API. Se verifica que solo
  existe una orden en producción para ese horno.
- Ocho solicitudes de creación con la misma clave de idempotencia se lanzan
  simultáneamente: deben devolver una sola orden. Se repite el patrón para una
  tanda y una recepción, verificando un único registro y un total de 25 kg.
- Pruebas unitarias mantienen pendientes las respuestas HTTP para comprobar
  doble clic, intento de iniciar otra orden, controles deshabilitados, conflicto
  409, error de lectura, reintento y cancelación de peticiones al salir.
- Los filtros rápidos de la bandeja de bodega cancelan lecturas anteriores;
  una respuesta antigua no puede reemplazar la selección más reciente.

## Problemas corregidos

Horno y saborizado no tenían una barrera en el handler para envíos solapados.
Ahora solo permiten un inicio pendiente y deshabilitan el resto de botones.
Saborizado tampoco bloqueaba el inicio de órdenes sin fórmula desde su lista.
Un fallo de lectura podía mostrarse como una lista vacía; se sustituye por un
estado de error con reintento. Los conflictos de inicio actualizan la lista y
muestran un aviso persistente, además del mensaje general de la API.

La etiqueta "En Vivo" se mostraba sin actualización automática. Ahora se indica
la hora de la última carga correcta y se ofrece un botón Actualizar. No se promete
sondeo en tiempo real. Las lecturas y acciones se cancelan al destruir la pantalla.

La bandeja de fórmulas podía recibir respuestas fuera de orden; cancela la lectura
anterior al recargar órdenes o fórmulas y libera recursos al salir.

## Límites

No certifica la ausencia total de errores ni la capacidad con muchos usuarios.
El entorno contiene datos ficticios y los conflictos se provocan de forma
controlada. Las sesiones y los procesos deben verificarse también en el piloto
operativo. Los navegadores adicionales conservan trazas cuando falla el caso.
Los usuarios ficticios se descartan junto con la base Docker; las órdenes del
caso se cancelan y eliminan mediante la API al terminar.

Las activaciones, desactivaciones y eliminaciones del catálogo de fórmulas
se serializan en la interfaz, con aviso de progreso y bloqueo de dobles envíos.
