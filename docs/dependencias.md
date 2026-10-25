# Dependencias y auditoría

`npm audit --omit=dev` se ejecuta en el CI solo para `backend` y debe salir con código 0.

## Excepción conocida (apps móviles)

`portal-mobile-reactnative` y `bodega-mobile-reactnative` conservan 4 avisos de severidad alta, todos de una
sola causa: `node-forge` (GHSA-86w9-cpqp-85rv, verificación de firmas RSA PKCS#1 v1.5), que llega por
`@expo/code-signing-certificates` → `@expo/cli` → `expo`.

- **No hay versión corregida**: el aviso afecta a `node-forge` ≤ 1.4.0, que es la última publicada. Subir de SDK no
  ayuda: `@expo/cli` 58.x (el más reciente) depende de la misma versión. `npm audit fix --force` propone *bajar*
  `expo` a 44, que no es una opción.
- **Alcance**: `node-forge` solo lo usa la herramienta de línea de comandos de Expo para firmar actualizaciones OTA
  (EAS Update); no entra en el binario de la app ni atiende solicitudes de usuarios. Estas apps no usan
  EAS Update.
- **Revisión**: repetir `npm audit` al actualizar de SDK y cuando `node-forge` publique una versión corregida.

El aviso de `zod` (consumo de memoria al validar colecciones enormes) sí tenía solución: `@expo/cli` pedía
`zod@3`, sin versión corregida en esa serie, y se fuerza `zod@^4.6.7` con `overrides` en el `package.json` de cada
app. Se comprobó que con ello siguen funcionando `expo config`, `expo export --platform android` (como en el CI) y
`expo prebuild --platform android`. Si una actualización de Expo rompe la CLI por esto, quitar el `overrides`.
