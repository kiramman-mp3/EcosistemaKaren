# Dependencias y auditoría

`npm audit --omit=dev` se ejecuta en el CI solo para `backend` y debe salir con código 0.

## Excepciones conocidas (apps móviles)

`portal-mobile-reactnative` y `bodega-mobile-reactnative` conservan 5 avisos de severidad alta que
`npm audit fix` no resuelve sin cambios incompatibles (`npm audit fix --force`):
`expo`, `@expo/cli`, `@expo/code-signing-certificates`, `node-forge` y `zod`. Todos llegan por el
SDK de Expo y se corrigen al actualizar de SDK. Son herramientas de compilación y empaquetado, no
código que atienda solicitudes de usuarios.

Se aplicó todo lo que `npm audit fix` actualiza sin romper: ambas apps pasan `tsc`, `jest` y
`expo export --platform android`. Al subir de SDK de Expo hay que repetir `npm audit` y retirar esta
excepción.
