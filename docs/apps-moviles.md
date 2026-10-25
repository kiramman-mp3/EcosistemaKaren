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

## Android (.apk)

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
