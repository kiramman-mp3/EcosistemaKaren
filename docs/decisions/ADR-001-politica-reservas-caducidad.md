# ADR-001: TTL de reservas y semáforo de caducidad

- Estado: Aceptada
- Fecha: 2026-10-09
- Alcance: Fase 1 del Ecosistema Karen

## Decisión

La política única del sistema es:

| Regla | Valor aprobado |
| --- | --- |
| TTL de una reserva | 10 minutos desde la confirmación del servidor |
| Vencido | 0 días o menos |
| Rojo | 1 a 6 días restantes |
| Amarillo | 7 a 14 días restantes |
| Normal/verde | 15 días o más |

El servidor es la fuente de verdad. Los clientes calculan la cuenta regresiva a partir de
`fechaExpiracion`; no deben iniciar un contador fijo al recibir la respuesta. La clasificación
de caducidad vive en la política de dominio `BusinessRules.js`.

## Motivo

El informe de arquitectura aprobado el 01/09/2026 y el informe UX/UI del 15/09/2026 son
posteriores a la especificación inicial del 26/08/2026. Ambos utilizan un TTL de 10 minutos y
los cortes de 7 y 15 días. Para productos perecibles, diez minutos también evita bloquear
existencias durante cuatro horas cuando el cliente abandona el proceso de retiro.

## Consecuencias

- La regla anterior de cuatro horas queda reemplazada para la Fase 1.
- La regla anterior rojo `<15`, amarillo `15–30` queda reemplazada.
- Cualquier cambio futuro requiere un nuevo ADR y pruebas de los valores frontera.
