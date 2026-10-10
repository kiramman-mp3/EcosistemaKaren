# UAT — Aplicación de bodega

## Preparación

- Backend y PostgreSQL con las semillas oficiales ejecutándose.
- APK de prueba configurado con `EXPO_PUBLIC_API_URL` apuntando al backend.
- Usuarios de prueba para `BODEGUERO`, `PERCHERO` y `ADMIN`.
- Un producto con código EAN, un lote próximo a vencer y una reserva pendiente.

## Criterios de aceptación

| ID | Escenario | Resultado esperado |
|---|---|---|
| UAT-01 | Iniciar sesión con cada rol | Bodeguero ve ingreso, alertas, inventario, caja y reportes; perchero solo alertas, inventario y reportes; administrador incluye aprobaciones. |
| UAT-02 | Escanear EAN en ingreso | La cámara completa el código y recupera el producto real; un código desconocido presenta error, sin datos simulados. |
| UAT-03 | Crear lote | El lote aparece en inventario y genera movimiento auditable de ingreso. |
| UAT-04 | Recibir alerta SSE | Una alerta emitida por backend actualiza la pantalla sin reiniciar la aplicación; después de cortar y restaurar red, el canal se reconecta. |
| UAT-05 | Escanear retiro y confirmar | El QR/PIN recupera la reserva; confirmar descuenta stock una sola vez y actualiza su estado. |
| UAT-06 | Registrar merma | Exige razón y cantidad válida; inventario y reporte reflejan el movimiento con usuario y fecha. |
| UAT-07 | Aprobar/rechazar promoción | Solo ADMIN accede; aprobar publica la oferta y rechazar exige motivo. Otros roles reciben 403 si llaman al endpoint. |
| UAT-08 | Consultar reportes | Totales y movimientos coinciden con los registros de inventario; sin registros se muestra “sin datos”. |
| UAT-09 | Trabajar sin backend | Se muestra estado offline y listas vacías; no aparecen mocks ni se permite asumir sincronización. |
| UAT-10 | Sesión inválida | Una credencial incorrecta no inicia sesión; un rol no operativo es rechazado. |

Registrar por cada caso: fecha, versión, dispositivo, responsable, resultado (Aprobado/Fallido), evidencia y observaciones. Una salida a producción requiere UAT-01 a UAT-10 aprobados y sin defectos críticos abiertos.

## Rendimiento

Con el backend iniciado, ejecutar `npm run test:performance` dentro de `backend`. Valores configurables: `PERF_BASE_URL`, `PERF_PATH`, `PERF_REQUESTS`, `PERF_CONCURRENCY` y `PERF_P95_MS`. El valor predeterminado exige cero errores y p95 menor o igual a 500 ms para `/heartbeat`.
