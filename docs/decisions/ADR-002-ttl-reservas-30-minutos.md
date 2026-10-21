# ADR-002: TTL de reservas de 30 minutos

- Estado: Aceptada
- Fecha: 2026-10-21
- Reemplaza: el TTL de 10 minutos de [ADR-001](ADR-001-politica-reservas-caducidad.md)
- Alcance: Ecosistema Karen (backend, portal web, portal móvil)

## Decisión

El TTL de una reserva pasa de 10 a **30 minutos** desde la confirmación del servidor. El
semáforo de caducidad de ADR-001 (vencido, rojo, amarillo, verde) no cambia.

El valor vive en `RESERVATION_TTL_MINUTES` de `BusinessRules.js`. Los clientes siguen
calculando la cuenta regresiva a partir de `fechaExpiracion`; las constantes de respaldo de
las apps (`APPROVED_RESERVATION_TTL_SECONDS`, `initialSeconds`) solo se usan si el servidor no
envía la fecha y se actualizaron a 30 minutos.

## Motivo

Diez minutos no alcanzan para que el cliente llegue a la sucursal y pase por caja.

## Consecuencias

- Una reserva abandonada bloquea las existencias hasta 30 minutos antes de que el sweeper las libere.
- Las reservas ya creadas conservan su `fecha_expiracion` original; solo las nuevas usan 30 minutos.
- Se actualizaron los textos de ambos portales, KarenBot, los términos y la documentación.
