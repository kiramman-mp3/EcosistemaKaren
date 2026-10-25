# Operación en producción

Guía para desplegar y mantener store-api (tienda) y portal-api (nube) según
[ADR-003](decisions/ADR-003-split-store-portal.md). El punto de partida es
`docker-compose.prod.example.yml`.

## Despliegue

Cada servicio va en su equipo con su propia base de datos:

```bash
# Tienda (red local)
docker compose -f docker-compose.prod.example.yml --env-file .env.store --profile store up -d --build
# Portal (nube)
docker compose -f docker-compose.prod.example.yml --env-file .env.portal --profile portal up -d --build
```

La imagen (`backend/Dockerfile`) es la misma para ambos; solo cambia el comando
(`index.store.js` o `index.portal.js`). Corre como usuario `node`, con sistema de archivos de
solo lectura y sin capacidades extra. Postgres no publica puertos y el compose no incluye
pgAdmin ni datos de demostración.

Las variables obligatorias están marcadas con `:?` en el compose: si falta una, `docker compose`
aborta antes de arrancar nada. `.env.store` y `.env.portal` no se versionan.

### Primer usuario

Con la base vacía no hay cuentas. Se crean desde el contenedor (la contraseña se pide sin eco o
se pasa en `KAREN_NEW_PASSWORD`):

```bash
docker compose -f docker-compose.prod.example.yml --profile store exec store_api \
  node scripts/create-user.js --rol=ADMIN --email=admin@tienda.example --nombre="Administrador"
```

Los clientes del portal se registran solos; los trabajadores de la tienda los crea el ADMIN.

## Secretos

| Variable | Dónde | Regla |
|---|---|---|
| `STORE_JWT_SECRET` / `PORTAL_JWT_SECRET` | uno por servicio (llegan como `JWT_SECRET`) | Distintos entre sí; 32+ caracteres aleatorios. Un token de la tienda no debe valer en el portal. |
| `STORE_SERVICE_KEY` | ambos servicios | Mismo valor en los dos, distinto de cualquier `JWT_SECRET`. Autentica el canal `/internal/v1`. |
| `DB_PASSWORD` / `PORTAL_DB_PASSWORD` | uno por base | Sin valor por defecto; el arranque en producción rechaza los valores de ejemplo. |
| `GEMINI_API_KEY` | solo la tienda | El portal no la necesita. |

Rotar `STORE_SERVICE_KEY`: cambiarla en ambos archivos `.env` y reiniciar los dos servicios; la
tienda reintenta lo pendiente (outbox) y no se pierde nada. Rotar un `JWT_SECRET` cierra todas las
sesiones de ese servicio.

## Proxy inverso y `TRUST_PROXY_HOPS`

Los límites de tasa y el registro de accesos usan la IP del cliente. Detrás de un balanceador o
CDN, Express solo la ve si sabe cuántos proxies confiar:

- `0`: sin proxy; la IP es la del socket. **Con un proxy delante y `0`, todos los clientes
  comparten una IP y se limitan entre sí.**
- `1`: un proxy (nginx, Caddy, balanceador) que añade `X-Forwarded-For`.
- `2`: por ejemplo CDN + balanceador.

No poner más saltos de los reales: un valor alto permite que un cliente falsee su IP con la
cabecera. El compose exige definirlo en el portal; en la tienda, que atiende solo a la red local,
suele ser `0`.

El límite general de tasa se lleva en memoria de cada instancia (con N réplicas, el tope efectivo
por IP es N veces el configurado); autenticación, reservas e IA se comparten vía PostgreSQL.

## Sondas y logs

| Ruta | Uso | Falla cuando |
|---|---|---|
| `GET /healthz` | liveness (el `HEALTHCHECK` de la imagen) | el proceso no responde; reiniciar |
| `GET /readyz` | readiness (balanceador) | la base no responde o faltan migraciones; dejar de enviar tráfico |

Van en la raíz, fuera de `/api/v1` y de los límites de tasa. `/readyz` de la tienda **no**
depende del portal: sin nube, la tienda sigue atendiendo a la red local y el estado de la
sincronización se consulta en `/api/v1/catalog/status` del portal.

En producción cada petición deja una línea JSON en stdout (`ACCESS_LOG=false` la apaga; `true` la
activa fuera de producción) con `requestId`, método, ruta sin query string, estado y duración. No
registra cabeceras, cookies ni cuerpos. El `requestId` es el mismo que devuelven las respuestas de
error y la cabecera `X-Request-Id`, y sirve para cruzar un reclamo con el log. El compose rota los
logs de Docker (5 × 10 MB).

## Copias de seguridad

Las dos bases se respaldan por separado. La del portal guarda clientes y reservas, que **no**
existen en ningún otro lugar; el catálogo del portal se reconstruye desde la tienda.

```bash
# Respaldo (formato custom, comprimido)
docker compose -f docker-compose.prod.example.yml --profile store exec -T store_db \
  sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > store-$(date +%F).dump

# Restauración sobre una base vacía
docker compose -f docker-compose.prod.example.yml --profile store exec -T store_db \
  sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' < store-2026-01-31.dump
```

Para el portal, igual con `--profile portal` y `portal_db`. Recomendado: respaldo diario, copia
fuera del equipo, retención de al menos 14 días y **una restauración de prueba** en otra base
antes de necesitarla. Los datos operativos viejos (comandos resueltos, contadores de tasa, tokens
vencidos) los purga el worker de mantenimiento (`RETENTION_DAYS`, 30 por defecto).

## Imágenes de productos

Las fotos locales de la tienda (`backend/public/media`, o `MEDIA_DIR`) se sincronizan solas al portal, que las guarda en
su base: entran en el respaldo del portal y no hace falta un volumen de medios en la nube. En la tienda es
conveniente montar `store_media` (ya está en el compose) para conservarlas entre despliegues. Si falta un archivo en
la tienda, el portal conserva su copia.
