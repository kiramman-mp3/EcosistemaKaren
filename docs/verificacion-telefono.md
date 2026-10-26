# Verificación en teléfono real

Comprobaciones que el navegador no puede cubrir: cámara, archivos, compartir y red local. Se pasan con los APK recién compilados de la bodega y del portal (F5), en un teléfono Android conectado a la misma Wi‑Fi que la PC de la tienda.

## Preparación

- En la PC: `node start.js --split` (store-api en el puerto 4000, portal-api en el 4001).
- Bodega compilada con `EXPO_PUBLIC_SERVER_CONFIG=1` para poder elegir el servidor desde la app.
- Cuentas demo (contraseña `Karen2026*`): `admin@demo.karen.ec`, `bodega@demo.karen.ec`, `percha@demo.karen.ec` y `cliente@demo.karen.ec`.

## Bodega

| ID | Qué hacer | Resultado esperado |
|---|---|---|
| TEL-01 | Abrir la app sin servidor configurado y tocar la franja del servidor | Se abre el selector; una dirección inválida muestra el ejemplo `192.168.1.20:4000`. |
| TEL-02 | Escribir la IP de la PC con el puerto 4000 y guardar | La app prueba la conexión, guarda la dirección y vuelve al ingreso. Tras cerrar y abrir la app, la dirección sigue guardada. |
| TEL-03 | Cambiar a otra dirección con la sesión iniciada | Se cierra la sesión y se vuelve a pedir el ingreso: cada servidor tiene sus propios usuarios. |
| TEL-04 | Mirar la cabecera con store-api y portal-api encendidos | Punto verde (en línea). Al apagar portal-api, en menos de un minuto pasa a rojo; al encenderlo, vuelve a verde. |
| TEL-05 | Cabecera en el teléfono | Se lee el nombre del operador completo; el estado es solo el punto de color y el modo oscuro está en el menú de perfil. |
| TEL-06 | Catálogo → foto de un producto → tomar con la cámara | Pide permiso de cámara la primera vez; la foto se sube comprimida y aparece en el catálogo y, en unos segundos, en el portal. |
| TEL-07 | Catálogo → foto → elegir de la galería | Igual que TEL-06 con una foto existente; una foto muy grande (más de 10 MB) también se acepta y se comprime. |
| TEL-08 | Recibir → escanear código de barras | La cámara lee el EAN y carga el producto; un código desconocido muestra un error sin datos inventados. |
| TEL-09 | Caja → escanear el QR de un pase del portal | Se carga la reserva y se puede confirmar una sola vez. |
| TEL-10 | Reportes → PDF | Se genera el PDF y se abre el menú de compartir; el encabezado dice Supermercado Karen, Patricia Rodríguez, RUC 1850410612001 y la dirección de Quero. |
| TEL-11 | Reportes → Excel | Se comparte un CSV que abre en Excel o Sheets con tildes correctas y los mismos datos del encabezado. |
| TEL-12 | Reportes en pantalla → Hoy, Últimos 7 días, Últimos 30 días | Las cuatro cifras cambian juntas con el período, caben en una línea y usan separador de miles (por ejemplo `$8,580.67`). El PDF y el Excel indican el período elegido. |
| TEL-18 | Recibir con `admin@demo.karen.ec` → escribir un nuevo PVP → Registrar lote | Pide confirmar "de $X a $Y"; al aceptar, el mensaje dice "PVP actualizado" y el portal muestra el nuevo precio en unos segundos. Con `bodega@demo.karen.ec` el campo no aparece. |
| TEL-19 | Ofertas → Por revisar con `admin@demo.karen.ec` → abrir un borrador | La sección "Límites de la oferta" muestra Máx. por pedido, Stock de oferta (con el tope "Hasta N"), Termina el y A las, en dos columnas que no se salen de la pantalla. |
| TEL-20 | En el borrador: stock de oferta mayor que el lote → Solo guardar | Aparece "no puede superar las N unidades libres del lote" y no se guarda. |
| TEL-21 | En el borrador: máximo 2, stock 3, atajo "Mañana 21:00" → Publicar oferta | Se publica; en la lista la tarjeta dice "Máx. 2 por pedido · 3 de 3 con descuento · Hasta …, 21:00", y la oferta aparece en el portal en unos segundos. |
| TEL-26 | Catálogo con `admin@demo.karen.ec` → Registrar producto → escanear un EAN nuevo → llenar los datos y tomar una foto con la cámara → Guardar | El producto queda registrado con su foto en el catálogo y, en unos segundos, en el portal. Con `bodega@demo.karen.ec` no aparece el botón de registrar. |
| TEL-27 | Catálogo con `admin@demo.karen.ec` → tocar un producto → cambiar nombre, pasillo, PVP y stock mínimo → Guardar cambios | El mensaje dice "Producto actualizado" (y el PVP anterior y el nuevo si cambió); la lista y el portal muestran los datos nuevos. El campo del EAN no se puede editar. |

## Portal (app del cliente)

| ID | Qué hacer | Resultado esperado |
|---|---|---|
| TEL-13 | Selector de servidor con la IP de la PC y el puerto 4001 | Igual que TEL-01 y TEL-02, contra portal-api. |
| TEL-14 | Inicio, Ofertas y Catálogo | Se ven los productos y las ofertas reales; ningún texto se corta ni se sale de la pantalla. |
| TEL-15 | Apartar con `cliente@demo.karen.ec` | Se muestra el pase con QR y temporizador de 30 minutos; en la bodega, TEL-09 lo encuentra. |
| TEL-16 | Política de privacidad | Aparecen Supermercado Karen, Patricia Rodríguez, el RUC y Quero, Tungurahua. |
| TEL-17 | KarenBot → hablar con un asesor | Abre WhatsApp con el número +593 98 355 3724 y el mensaje ya escrito. |
| TEL-22 | Catálogo → filtros "Más vendidos" y "Nuevos" | Cada filtro muestra solo los productos con su insignia (llama o destello) y los ordena por ventas o por fecha de alta. |
| TEL-23 | Ofertas → la oferta publicada en TEL-21 | Dice "Termina mañana a las 21:00" y "Máx. 2 por pedido". La app aparta de a una unidad: las tres primeras veces sale el pase; la cuarta falla con "Las unidades de esta oferta ya se agotaron" y la oferta desaparece de la lista. |
| TEL-24 | Mis reservas con `cliente@demo.karen.ec` recién sembrado | Hay dos reservas por retirar con tiempo restante y el historial con retiradas, vencidas y canceladas. "Añadir más tiempo" suma 30 minutos. |
| TEL-25 | Apartar con `cliente@demo.karen.ec` → abrir el pase → "¿Necesitas más tiempo? +30 min" | Aparece "+30 minutos añadidos con éxito" y el temporizador sube media hora. Tras llegar a 4 horas en total, el botón se reemplaza por "Llegaste al máximo de 4 horas para esta reserva". |
| TEL-28 | Carrito → elegir 45 min, 1 h, 1 h 30 o 2 h → Apartar | El temporizador del pase parte del tiempo elegido (por ejemplo 90:00 para 1 h 30) y Mis reservas muestra el vencimiento correcto. La nota del carrito repite la duración elegida. |
| TEL-29 | Catálogo → Ordenar: Menor precio y Mayor precio; filtro En oferta | El orden cambia según el precio (con el precio de oferta si lo hay); "En oferta" deja solo los productos con oferta vigente. |
| TEL-30 | Inicio → bajar hasta los datos de la tienda | Se ven dirección, horario, teléfono, correo, WhatsApp y Facebook. Teléfono y correo abren la app de llamadas y de correo; "Cómo llegar" abre el mapa en la ubicación de la tienda y WhatsApp abre el chat con el mensaje escrito. |
| TEL-31 | Inicio → Términos y condiciones | Abre con pestañas: Todas, Privacidad y LOPDP, Reservas y tiempos, FEFO y ofertas, Pagos y retiro. "Política de privacidad" abre directamente la pestaña de privacidad. |
| TEL-32 | Pase de retiro → icono de copiar junto al código | El icono cambia a una marca de verificación y, al pegar en otra app, aparece el código KR-XXXXXX. |
| TEL-33 | Pase de retiro → Guardar como imagen | Se abre la hoja de compartir con un PNG del pase (QR y código) sin los botones; se puede guardar en la galería o enviar por WhatsApp. |
| TEL-34 | Con el portal-api encendido y la tienda apagada más de unos minutos | Aparece la franja "El stock que ves puede no estar al día"; desaparece al volver a sincronizar la tienda y refrescar el catálogo. |

## Tabletas

Se pasan en una tableta (o emulador) de 8 a 11 pulgadas, en vertical y en horizontal, con los APK de la bodega y del portal.

| Caso | Qué hacer | Resultado esperado |
|---|---|---|
| TAB-01 | Portal → Productos, en vertical y luego girar la tableta | La cuadrícula pasa de 4 a 5 columnas sin que se corten las tarjetas; el filtro y la búsqueda siguen funcionando tras girar. |
| TAB-02 | Portal → Por vencer y Mis reservas | Ofertas en 2 o 3 columnas; las reservas en una columna centrada en vertical y en dos en horizontal. |
| TAB-03 | Portal → Inicio | El texto de bienvenida queda a la izquierda y las ofertas a la derecha; los pasillos en 3 o 4 columnas y los 3 pasos en fila. |
| TAB-04 | Portal → carrito, pase de retiro, KarenBot y Servidor | La hoja del carrito y el chat quedan centrados y acotados, sin estirarse de borde a borde. |
| TAB-05 | Bodega → Por vencer, Lotes, Ofertas y Catálogo en horizontal | Las tarjetas van en dos columnas; en vertical, en una. Los botones de cada tarjeta no se montan. |
| TAB-06 | Bodega → Recibir y Caja | El formulario queda centrado con un ancho cómodo; las pestañas de abajo se agrupan en el centro. |
| TAB-07 | Bodega → Catálogo con el ADMIN → registrar o editar un producto | El formulario aparece como hoja centrada, no a todo lo ancho. |

Registrar por cada caso: fecha, modelo del teléfono y versión de Android, versión del APK, resultado (Aprobado/Fallido) y captura cuando falle.
