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

## Portal (app del cliente)

| ID | Qué hacer | Resultado esperado |
|---|---|---|
| TEL-13 | Selector de servidor con la IP de la PC y el puerto 4001 | Igual que TEL-01 y TEL-02, contra portal-api. |
| TEL-14 | Inicio, Ofertas y Catálogo | Se ven los productos y las ofertas reales; ningún texto se corta ni se sale de la pantalla. |
| TEL-15 | Apartar con `cliente@demo.karen.ec` | Se muestra el pase con QR y temporizador de 30 minutos; en la bodega, TEL-09 lo encuentra. |
| TEL-16 | Política de privacidad | Aparecen Supermercado Karen, Patricia Rodríguez, el RUC y Quero, Tungurahua. |
| TEL-17 | KarenBot → hablar con un asesor | Abre WhatsApp con el número +593 98 355 3724 y el mensaje ya escrito. |

Registrar por cada caso: fecha, modelo del teléfono y versión de Android, versión del APK, resultado (Aprobado/Fallido) y captura cuando falle.
