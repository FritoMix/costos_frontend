# Asistente de horno: responsabilidades y reglas

## Alcance del primer bloque

Esta extracción mantiene el comportamiento y el contrato de la tanda. No cambia permisos, cálculos del backend, duración ni condiciones de avance. Se comienza con el constructor de solicitudes, las validaciones de pasos y tres componentes de presentación. Los pasos de mezcla, referencia, bultos, temperatura, desperdicio y resumen quedan para una extracción posterior.

## Dónde cambiar cada cosa

| Archivo en `src/app/features/horno/` | Responsabilidad |
| --- | --- |
| `horno-asistente.page.ts` | Coordinar carga, estado local mediante Signals, navegación, protección de cambios y guardado. |
| `horno-asistente.page.html` | Estructura de pantalla, avisos y conexión de pasos con sus datos. |
| `asistente/pasos-tanda.ts` | Orden de pasos y textos del asistente. |
| `asistente/reglas-tanda.ts` | Validaciones puras de avance, conversión de texto numérico y consumo mostrado. Incluye el tipo de los datos del formulario. |
| `asistente/solicitud-tanda.ts` | Convertir una instantánea del formulario al contrato `RegistroHornoGuardar`, sin efectos secundarios. |
| `asistente/paso-horario.component.*` | Mostrar inicio y fin; emitir ajustes de minutos y reinicio de hora. |
| `asistente/paso-personal.component.*` | Mostrar opciones y emitir selección; reutilizado para ambas áreas de personal. |
| `asistente/paso-aceite.component.*` | Capturar el nivel y mostrar el consumo que recibe del coordinador. |

Los componentes de presentación no inyectan servicios HTTP ni reciben el componente padre. El estado persiste en el coordinador al ir adelante o atrás. Los hijos usan Inputs, Models y Outputs tipados con OnPush. No se añade un estado global.

## Comportamiento conservado

- Con fórmula: horario, mezcla, temperatura, personal de zona húmeda, selección, aceite inicial, aceite final, desperdicio y resumen.
- Orden histórica: el paso de mezcla se sustituye por referencia y bultos.
- La tanda dura una hora; inicio puede atrasarse 15, 30 o 60 minutos o reiniciarse a la hora actual. El coordinador conserva el reloj y calcula el fin.
- La mezcla necesita una suma positiva, no superar capacidad ni restante por referencia y no aceptar filas negativas. Las filas a cero se omiten de la solicitud.
- El avance exige seleccionar personal y temperatura. El aceite final no puede superar el inicial; si se declara desperdicio se necesita tipo y cantidad positiva.
- Con fórmula se envían las referencias; en la orden histórica se envían referencia y cantidad en la cabecera. El constructor conserva los campos opcionales y nulos anteriores.
- La API mantiene las validaciones definitivas de precisión, tiempo, capacidad, estado y permisos. Las comprobaciones del frontend no la sustituyen.
- Se conservan la protección de cambios sin guardar, bloqueo de envío, tratamiento de errores y clave de idempotencia del servicio existente.

## Evidencia

`asistente/reglas-tanda.spec.ts` comprueba recorridos, límites y cuerpos HTTP de ambos formatos, incluido cambio de día y desperdicio. `asistente/pasos-presentacion.spec.ts` comprueba eventos, controles y selección de los componentes extraídos. `e2e/flujo-critico.spec.ts` recorre el asistente con API y PostgreSQL reales, conserva las comprobaciones de cambios sin guardar y errores, y genera capturas de personal y aceite en el artefacto `revision-diseno`.

## Continuación prevista

Extraer mezcla y resumen antes de introducir un contenedor adicional de estado: comparten las proyecciones de producción y merecen una revisión específica. Después se podrá abordar el servicio de órdenes del backend en un PR independiente, manteniendo una sola transacción por operación de negocio.
