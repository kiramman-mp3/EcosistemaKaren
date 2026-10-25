# Compilar las apps móviles

Dos apps Expo: **portal** (`frontend/portal-mobile-reactnative`, clientes, habla con portal-api en el
puerto 4001) y **bodega** (`frontend/bodega-mobile-reactnative`, personal, habla con store-api en el
4000, solo por la red local).

## Builds de prueba en red local (cambian de wifi sin recompilar)

Dos variables de compilación activan el modo de pruebas:

| Variable | Efecto |
|---|---|
| `KAREN_ALLOW_CLEARTEXT=1` | Permite HTTP sin cifrar (Android `usesCleartextTraffic`; iOS `NSAllowsLocalNetworking`, solo hacia IPs de red local). Lo aplica `app.config.js`. Sin la variable, el build queda con el bloqueo por defecto. |
| `EXPO_PUBLIC_SERVER_CONFIG=1` | Muestra una franja "Servidor: … · cambiar" arriba de la app. Al tocarla se escribe la IP (`192.168.1.20`, `192.168.1.20:4001` o una URL `https://…`), se prueba la conexión y se guarda en el teléfono. |

Cambiar de casa a la universidad es tocar la franja y escribir la IP nueva. Al cambiar de servidor se
cierra la sesión (otro servidor es otra base de usuarios). Sin `EXPO_PUBLIC_SERVER_CONFIG`, la dirección
queda fija en `EXPO_PUBLIC_API_URL` y no hay forma de cambiarla desde la app: es lo que corresponde a un
build de tienda.

La IP del PC se ve con `ipconfig`. El backend debe escuchar en la red (no solo en `localhost`) y el
firewall de Windows debe permitir los puertos 4000/4001.

## Fotos de productos desde la app de bodega

En **Catálogo**, el ADMIN y el BODEGUERO tocan la miniatura de un producto para **tomar una foto con la cámara** o elegirla de la
galería. La app reduce la foto en el teléfono (lado largo 1280 px, JPEG al 75 %) antes de subirla —una foto de cámara de 10 MB
sale en ~300 KB— y el servidor la vuelve a comprimir (máx. 1024 px), la guarda y la sincroniza con el portal.

Usa los módulos nativos `expo-image-picker` y `expo-image-manipulator`: **hay que volver a compilar el APK** de bodega para tener
esta función (un APK anterior no la trae). El permiso de cámara ya lo pedía la app para escanear códigos.

## Registrar y editar productos (ADMIN)

En **Catálogo**, el ADMIN registra un producto con **Registrar producto** (escanea el EAN) y lo edita tocándolo en la lista. Los dos
usan el mismo formulario: pasillo, nombre, marca y contenido, PVP, IVA, stock mínimo y **foto opcional** (cámara o galería). La foto
elegida se reduce igual que arriba y se sube al guardar; si la subida falla el producto queda guardado y la app avisa para repetirla
desde la miniatura. El **código EAN no se puede cambiar** al editar. Si el PVP cambia, queda en la bitácora de precios
(`PUT /products/:id`). No agrega módulos nativos, pero el APK lleva el código de la app: **hay que recompilarlo** para tener el formulario.

## Reportes de bodega (PDF y Excel)

En **Reportes**, los botones **PDF** y **Excel** exportan los movimientos y mermas. En el navegador el PDF abre el diálogo de
impresión y el Excel (CSV) se descarga; en el teléfono ambos abren la hoja de compartir (correo, WhatsApp, Drive...). Los datos que
escribe el personal (nombres de producto, motivos) se escapan en el PDF y se neutralizan en el CSV para que Excel no ejecute
fórmulas. Llevan el período elegido (hoy, 7 o 30 días). El nombre comercial, la razón social, la dirección y el RUC que se imprimen
son los reales de la tienda y están en `src/config/storeInfo.ts`; cada dato se puede cambiar al compilar con su variable
`EXPO_PUBLIC_STORE_*` (ver `.env.example`). Usa `expo-print`, `expo-sharing` y `expo-file-system`, por lo que **hay que recompilar el APK**
para tener esta función.

## Qué trae un APK compilado ahora

Las apps no se actualizan solas: todo lo que cambia en su código llega al teléfono solo con un APK nuevo. Desde los APK anteriores:

| App | Cambios |
|---|---|
| Bodega | Datos reales de la tienda; encabezado y métricas compactos en pantallas angostas; resumen de reportes por período; el ADMIN puede cambiar el PVP al ingresar un lote; el ADMIN fija en cada oferta el máximo por pedido, el stock de oferta y la fecha y hora de fin; el ADMIN registra y edita productos desde el catálogo, con foto opcional. |
| Portal | Datos reales de la tienda; filtros "Más vendidos" y "Nuevos" con datos reales; las ofertas muestran su hora real de fin, el máximo por pedido y las unidades que quedan; el pase de retiro dice "Supermercado Karen"; el cliente elige cuánto tiempo apartar (30 minutos a 2 horas) y puede sumar 30 minutos desde Mis reservas o desde el pase, hasta 4 horas; el catálogo se ordena por precio y filtra "En oferta"; aviso cuando el stock puede no estar al día; términos y condiciones por pestañas; datos de la tienda con teléfono, correo, WhatsApp, Facebook y "Cómo llegar"; copiar el código y guardar el pase como imagen. |

Los cambios de la bodega no agregan módulos nativos: basta recompilar con los mismos pasos. El portal sí: suma `expo-clipboard`, `expo-sharing` y `react-native-view-shot` (copiar el código y guardar el pase como imagen), así que hay que recompilarlo y no sirve actualizar solo el JavaScript de un APK anterior. Después de instalar, conviene
repasar la lista de [verificación en un teléfono](verificacion-telefono.md).

## Android (.apk)

### En GitHub Actions (sin instalar nada en el PC)

El workflow **Build Android APK** (`.github/workflows/build-android-apk.yml`) compila los dos APK en un runner de Linux, que ya trae el
SDK de Android. Se lanza a mano en GitHub: **Actions > Build Android APK > Run workflow**, sobre la rama que se quiera compilar (el
código tiene que estar en GitHub). La casilla de la red local (marcada por defecto) equivale a `KAREN_ALLOW_CLEARTEXT=1` y
`EXPO_PUBLIC_SERVER_CONFIG=1`. Al terminar, `SupermercadoKaren-portal-apk` y `SupermercadoKaren-bodega-apk` quedan como artefactos
de la ejecución durante 14 días: se descargan como `.zip` con el `.apk` dentro.

### En el PC

Hace falta Android Studio (trae el JDK y el SDK). Desde la carpeta de cada app:

```bash
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"
# El JDK de Android Studio (25) imprime un aviso que el plugin de Android toma por un error.
export JAVA_TOOL_OPTIONS="--enable-native-access=ALL-UNNAMED"
export KAREN_ALLOW_CLEARTEXT=1 EXPO_PUBLIC_SERVER_CONFIG=1
npx expo prebuild --platform android --no-install
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

El APK queda en `android/app/build/outputs/apk/release/app-release.apk`. Está firmado con la clave de
depuración que genera Expo: sirve para instalar en tus teléfonos, **no** para publicar en Play Store.
`-PreactNativeArchitectures=arm64-v8a` compila solo para teléfonos de 64 bits (casi todos); quítalo para
incluir también 32 bits y emuladores x86.


## iOS (.ipa)

Xcode solo existe en macOS, así que desde Windows se compila en la nube. La vía principal es un
**build personalizado de EAS** (`frontend/portal-mobile-reactnative/.eas/build/ios-altstore.yml`): corre
`expo prebuild` y `xcodebuild archive` **sin firmar** en un Mac de Expo y publica el `.ipa`. Como no firma,
no necesita cuenta de pago de Apple ni credenciales en EAS. Se instala con AltStore o Sideloadly, que lo
firman con tu Apple ID; con un Apple ID gratuito la firma caduca a los 7 días y hay que renovarla.

```bash
cd frontend/portal-mobile-reactnative
npx eas-cli login                          # una sola vez
npx eas-cli build -p ios -e ios-altstore
```

El enlace del `.ipa` aparece en la salida y en expo.dev (proyecto `portal-mobile-karen`). El perfil
`ios-altstore` de `eas.json` fija `KAREN_ALLOW_CLEARTEXT=1` y `EXPO_PUBLIC_SERVER_CONFIG=1`.

EAS solo sube lo que está **commiteado**. La regla `build/` del `.gitignore` raíz ocultaba `.eas/build/`;
por eso hay una excepción `!**/.eas/build/`. Si el build falla en `PARSE_CUSTOM_WORKFLOW_CONFIG` con
"ENOENT … ios-altstore.yml", el archivo no llegó a EAS.

Alternativa sin cuenta de EAS: el workflow de GitHub Actions **Build iOS IPA**
(`.github/workflows/build-ios-ipa.yml`, se lanza a mano en Actions > Run workflow) hace lo mismo en un runner
de macOS. Para publicar en App Store/TestFlight haría falta una cuenta de pago del Apple Developer Program y un
`eas build -p ios` normal, que gestiona los certificados.
