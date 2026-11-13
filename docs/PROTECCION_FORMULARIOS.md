# Protección de formularios de planta

Se protege la salida de las rutas de horno, recepción de saborizado, fórmula de
orden, alta/edición de fórmulas del catálogo y referencias de bodega. Se conserva
la protección previa de órdenes y usuarios.

`seguirCambios` compara los datos editables con los cargados o guardados por la
API. Incluye cantidades introducidas con botones, filas, notas y horarios
ajustados; excluye resultados de proyecciones y el paso visible del asistente.
Volver a los valores originales elimina el aviso. Las cargas iniciales y las
precargas de mezclas se aceptan como punto de partida.

La navegación interna y la recarga avisan de datos pendientes. La navegación
interna espera a que termine una escritura; los controles quedan inertes mientras
se procesa para evitar edición y dobles envíos. La sesión terminada puede volver
al acceso. El listener de recarga se elimina al destruir la pantalla.

Cambiar de referencia o recepción, o cancelar una corrección, pide confirmación
si descarta cambios. Un guardado fallido conserva el borrador. Solo un resultado
correcto acepta el estado guardado o restablece el formulario. Eliminar la
referencia que se está editando limpia su editor tras el borrado correcto.

No hay almacenamiento persistente del borrador: confirmar un descarte, cerrar
el navegador o perder la sesión puede perderlo. El aviso de recarga depende del
navegador y de que haya interacción previa; no protege contra cierres del proceso
o cortes eléctricos.

Verificación: pruebas unitarias de seguimiento, navegación y escrituras
pendientes; Playwright recorre las cinco pantallas, cancela salidas y simula
respuestas 503 al guardar referencia, tanda y recepción antes de reintentar.
También comprueba descartar/cancelar correcciones dentro de bodega y saborizado.

El grupo E2E que simula errores HTTP bloquea service workers para que
Playwright pueda interceptar las peticiones. Las demás pruebas conservan
la configuración PWA habitual. La aplicación no modifica su service worker.
