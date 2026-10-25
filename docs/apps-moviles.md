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

Xcode solo existe en macOS, así que desde Windows se compila en GitHub Actions:
**Actions > Build iOS IPA > Run workflow** (`.github/workflows/build-ios-ipa.yml`). El runner de macOS
ejecuta `expo prebuild`, archiva con Xcode **sin firmar** y publica el `.ipa` como artefacto (14 días).
Ese `.ipa` se instala con AltStore o Sideloadly, que lo firman con tu Apple ID; con un Apple ID gratuito
la firma caduca a los 7 días y hay que renovarla desde AltStore.

Si algún día se publica en App Store/TestFlight, hará falta una cuenta de pago del Apple Developer Program
y compilar con EAS Build (`eas build -p ios`), que gestiona los certificados.
