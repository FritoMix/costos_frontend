# Revisión del flujo de producción — 17 de noviembre de 2026

Alcance: Bodega define referencias y fórmulas; una orden conserva su mezcla, Horno registra las tandas y Saborizado los pesos reales. Los totales excluyen registros eliminados. Esta revisión valida reglas y pruebas del código en un entorno desechable; no modifica datos operativos de Supabase.

## Hallazgos corregidos

| Incidencia | Gravedad | Problema | Corrección |
| --- | --- | --- | --- |
| FLUJO-01 | Alta | Se calculaban kg con 0.014 bultos, pero la columna conservaba 0.01; valores menores podían terminar en un rechazo tardío de la base. | Validar escala y tamaño de entradas contra NUMERIC antes de calcular y guardar; comprobar la suma de referencias y el resultado de convertir canastillas. |
| FLUJO-02 | Media | Una recepción nueva admitía un sabor desactivado. | Rechazar nuevos usos; conservar el sabor anterior al corregir un registro histórico. |
| FLUJO-03 | Media | No se validaba el turno de una orden antes de escribir. | Rechazar turnos inexistentes o inactivos; permitir conservar el turno de una orden anterior. |
| FLUJO-04 | Alta | El interceptor ocultaba los errores 422 y los formularios no mostraban el motivo. | Mostrar el mensaje de validación, mantener la sesión y propagar el error al formulario para habilitar el reintento. Los errores decimales del backend se explican en español. |

## Evidencia automatizada

- Backend: `tests/test_precision_produccion.py` y `test_ordenes_flujo.py` prueban escala, límites y conversiones que terminarían en cero o desbordarían la columna.
- PostgreSQL: `tests/integration/test_flujo_orden.py` comprueba los catálogos inactivos y la conservación de datos históricos.
- HTTP: `tests/integration/test_api.py` comprueba rechazo 422 sin escritura, reintento válido y una matriz de cinco roles sobre inicio, tanda, recepción y fórmula.
- Concurrencia: `tests/integration/test_concurrencia_produccion.py` usa conexiones independientes. Dos recepciones con el mismo horario dejan una sola recepción y pesos exactos; una recepción y un cierre simultáneos respetan el bloqueo de la orden. Se conservan los casos previos de hornos y tandas simultáneas.
- Frontend: la prueba del interceptor exige un aviso visible en 422 y confirma que la sesión no cambia. El E2E provoca un 422 al guardar una tanda, comprueba el mensaje y completa el registro después de reintentar conservando el formulario.

Las ejecuciones y sus resultados quedan en GitHub Actions y en las descripciones de los PR de `estabilizacion/flujo-integral`. Las mediciones de carga de CI no equivalen a la capacidad de Render o Supabase.

La revisión de permisos cubre las cuatro escrituras indicadas; no constituye una certificación exhaustiva de todas las rutas del sistema. Bodega se verifica con su comportamiento actual de referencias y fórmulas, sin introducir movimientos de inventario que el sistema no implemente.
