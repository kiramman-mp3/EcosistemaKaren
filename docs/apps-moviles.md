# Compilar las apps móviles

Dos apps Expo: **portal** (`frontend/portal-mobile-reactnative`, clientes, habla con portal-api) y
**bodega** (`frontend/bodega-mobile-reactnative`, personal, habla con store-api), las dos por la URL
pública HTTPS del homelab (ver abajo). La versión **1.0.0** se compiló con EAS y se publica como
[release de GitHub](https://github.com/kiramman-mp3/EcosistemaKaren/releases/tag/v1.0.0).

## Versión 1.0.0 y distribución

| Archivo | App | Plataforma | Cómo se compila |
|---|---|---|---|
| `SupermercadoKaren-portal-v1.0.0.apk` | Portal (clientes) | Android | `eas build -p android --profile android-apk` |
| `SupermercadoKaren-bodega-v1.0.0.apk` | Bodega (personal) | Android | `eas build -p android --profile android-apk` |
| `SupermercadoKaren-portal-v1.0.0-sin-firmar.ipa` | Portal (clientes) | iPhone | `eas build -p ios -e ios-altstore` |

La versión de las apps es `1.0.0` en `app.json` y `package.json`, igual que la etiqueta `v1.0.0` del repositorio.
Los instaladores se guardan en `dist-mobile/` (carpeta ignorada por git: pesan más de 200 MB) y se suben como
archivos del release con sus sumas SHA-256. Al compilar una versión nueva se vacía esa carpeta y se dejan solo los
instaladores nuevos. Los APK de EAS son universales (arm64, armeabi-v7a, x86 y x86_64): sirven en teléfonos,
tabletas y emuladores, incluido Windows Subsystem for Android.

## Dirección del servidor

Cada app lleva **fija en el código** la dirección del homelab (`src/api/serverConfig.ts`, `HOMELAB_API_URL`):

| App | Dirección |
|---|---|
| Portal | `https://servidor-homelab.tail13541c.ts.net:8443/api/v1` (portal-api) |
| Bodega | `https://servidor-homelab.tail13541c.ts.net:10000/api/v1` (store-api) |

No hay pantalla ni almacenamiento para cambiarla: un teléfono solo habla con ese servidor, y por ser HTTPS no
hace falta permitir tráfico sin cifrar. Para desarrollar con `node start.js`, `EXPO_PUBLIC_API_URL` apunta Metro
al backend local, pero solo se lee cuando la app corre en desarrollo (`__DEV__`): un APK o IPA la ignora,
aunque exista un `.env` con otra dirección. Si cambia el nombre del servidor, se edita `HOMELAB_API_URL` en
las dos apps y se recompilan.

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

## Tabletas

Las dos apps se adaptan al ancho de la pantalla y no al modelo del aparato: desde 600 px se consideran tableta, así que también
responden al girar la tableta o a la ventana dividida. En el portal la cuadrícula de productos sube hasta 5 columnas, las ofertas
a 2 o 3, y Inicio pone el texto junto a las ofertas. En la bodega las listas de tarjetas pasan a 2 columnas desde 840 px, y los
formularios, las hojas y las pestañas quedan centrados con un ancho máximo. En iPad la app ya no corre en modo de compatibilidad
con iPhone (`supportsTablet`) y ninguna app bloquea la orientación. Es un cambio de configuración nativa: hay que recompilar el APK o IPA.

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
| Bodega | Dirección fija del homelab (sin pantalla para cambiarla); la foto de un producto se guarda aunque el teléfono declare otro tipo de archivo; datos reales de la tienda; encabezado y métricas compactos en pantallas angostas; resumen de reportes por período; el ADMIN puede cambiar el PVP al ingresar un lote; el ADMIN fija en cada oferta el máximo por pedido, el stock de oferta y la fecha y hora de fin; el ADMIN registra y edita productos desde el catálogo, con foto opcional. |
| Portal | Dirección fija del homelab (sin pantalla para cambiarla); animación de carga en las fotos de producto; datos reales de la tienda; filtros "Más vendidos" y "Nuevos" con datos reales; las ofertas muestran su hora real de fin, el máximo por pedido y las unidades que quedan; el pase de retiro dice "Supermercado Karen"; el cliente elige cuánto tiempo apartar (30 minutos a 2 horas) y puede sumar 30 minutos desde Mis reservas o desde el pase, hasta 4 horas; el catálogo se ordena por precio y filtra "En oferta"; aviso cuando el stock puede no estar al día; términos y condiciones por pestañas; datos de la tienda con teléfono, correo, WhatsApp, Facebook y "Cómo llegar"; copiar el código y guardar el pase como imagen. |

Los cambios de la bodega no agregan módulos nativos: basta recompilar con los mismos pasos. El portal sí: suma `expo-clipboard`, `expo-sharing` y `react-native-view-shot` (copiar el código y guardar el pase como imagen), así que hay que recompilarlo y no sirve actualizar solo el JavaScript de un APK anterior. Después de instalar, conviene
repasar la lista de [verificación en un teléfono](verificacion-telefono.md).

## Android (.apk)

### Con EAS (la vía de la versión 1.0.0)

Compila en la nube de Expo y no necesita Android Studio. Hace falta una cuenta de Expo (`npx eas-cli login`) y
que los cambios estén **commiteados**, porque EAS solo sube lo que está en git. Desde la carpeta de cada app:

```bash
cd frontend/portal-mobile-reactnative      # o frontend/bodega-mobile-reactnative
npx eas-cli build -p android --profile android-apk
```

El perfil `android-apk` de `eas.json` genera un `.apk` (no un `.aab`) firmado con la clave que EAS guarda en
la cuenta, así que las versiones siguientes se instalan encima de las anteriores. El enlace de descarga sale en la
terminal y en expo.dev; en el plan gratuito el build puede esperar varios minutos en cola. Para lanzarlo sin
esperar y bajarlo después: `--no-wait` y luego `npx eas-cli build:view <id>`.

### En el PC

Hace falta Android Studio (trae el JDK y el SDK). Desde la carpeta de cada app:

```bash
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"
# El JDK de Android Studio (25) imprime un aviso que el plugin de Android toma por un error.
export JAVA_TOOL_OPTIONS="--enable-native-access=ALL-UNNAMED"
npx expo prebuild --platform android --no-install
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

El APK queda en `android/app/build/outputs/apk/release/app-release.apk`. Está firmado con la clave de
depuración que genera Expo: sirve para instalar en tus teléfonos, **no** para publicar en Play Store.
`-PreactNativeArchitectures=arm64-v8a` compila solo para teléfonos de 64 bits (casi todos); quítalo para
incluir también 32 bits y emuladores x86.


## Instalar el APK en Windows (Windows Subsystem for Android)

Sirve para probar las apps sin un teléfono. WSA corre Android x86_64 y el APK universal lo cubre. Con WSA en
marcha y el **modo de desarrollador** activado en su configuración, desde PowerShell:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb connect 127.0.0.1:58526
& $adb -s 127.0.0.1:58526 install -r dist-mobile\SupermercadoKaren-portal-v1.0.0.apk
& $adb -s 127.0.0.1:58526 install -r dist-mobile\SupermercadoKaren-bodega-v1.0.0.apk
```

Si Android responde `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, ya hay una versión firmada con otra clave: se desinstala
(`adb -s 127.0.0.1:58526 uninstall com.ecosistemakaren.portal` o `.bodega`; se pierden sus datos locales, como la
sesión) y se instala de nuevo. Las apps llegan al servidor del homelab por internet, así que el PC necesita conexión.
Paquetes: `com.ecosistemakaren.portal` y `com.ecosistemakaren.bodega`.

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
`ios-altstore` de `eas.json` ya no fija variables: la dirección del servidor va en el código.

EAS solo sube lo que está **commiteado**. La regla `build/` del `.gitignore` raíz ocultaba `.eas/build/`;
por eso hay una excepción `!**/.eas/build/`. Si el build falla en `PARSE_CUSTOM_WORKFLOW_CONFIG` con
"ENOENT … ios-altstore.yml", el archivo no llegó a EAS.

Para publicar en App Store/TestFlight haría falta una cuenta de pago del Apple Developer Program y un
`eas build -p ios` normal, que gestiona los certificados.
