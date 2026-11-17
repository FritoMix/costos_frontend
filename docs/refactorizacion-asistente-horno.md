# Asistente de horno: responsabilidades y reglas

## Alcance de los dos primeros bloques

Esta extracción mantiene el comportamiento y el contrato de la tanda. No cambia permisos, cálculos del backend, duración ni condiciones de avance. El primer bloque extrajo el constructor de solicitudes, las validaciones y los pasos de horario, personal y aceite. El segundo separa mezcla y resumen, con proyecciones compartidas y cambios de bultos sin mutar los datos. Referencia, bultos, temperatura y desperdicio siguen en la plantilla principal.

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
| `asistente/paso-mezcla.component.*` | Mostrar las referencias, límites y totales; emitir cambios de bultos al coordinador. |
| `asistente/paso-resumen.component.*` | Presentar la confirmación de fórmula o tanda histórica; no guarda ni modifica datos. |
| `asistente/proyeccion-mezcla.ts` | Totales y barra de capacidad compartidos; actualización de una fila sin mutación. |

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

`asistente/reglas-tanda.spec.ts` comprueba recorridos, límites y cuerpos HTTP de ambos formatos, incluido cambio de día y desperdicio. `asistente/pasos-presentacion.spec.ts` comprueba eventos, controles y selección de los componentes extraídos. `e2e/flujo-critico.spec.ts` recorre el asistente con API y PostgreSQL reales, conserva las comprobaciones de cambios sin guardar y errores, y genera capturas de personal, aceite, mezcla y resumen en el artefacto `revision-diseno`. Mezcla y resumen se revisan también a 390 px. `asistente/proyeccion-mezcla.spec.ts` cubre referencias múltiples, rendimiento opcional, redondeo, límites, eventos y ambos tipos de resumen. El E2E cambia bultos, avanza y vuelve para verificar la conservación de estado.

## Continuación prevista

Mezcla y resumen ya están separados. Las extracciones restantes se pueden realizar en otro bloque si facilitan cambios concretos. A continuación se podrá abordar el servicio de órdenes del backend en un PR independiente, manteniendo una sola transacción por operación de negocio.
