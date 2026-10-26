# Despliegue en Azure

Guía para publicar el portal (API + web) en Azure y conectar la PC de la tienda. Complementa
[operacion.md](operacion.md) y sigue [ADR-003](decisions/ADR-003-split-store-portal.md).

```
 clientes (web / app) ──► Azure Container Apps ──► Azure Database for PostgreSQL
                          portal-api + portal web      (base del portal)
                                   ▲
                                   │ HTTPS saliente (cola outbox)
 PC de la tienda  ─── store-api + Postgres local ◄── apps de bodega (Wi-Fi de la tienda)
```

- El **portal web se sirve desde la misma imagen que portal-api** (`PORTAL_STATIC_DIR`). La cookie
  de sesión es `SameSite=Strict` en producción, así que web y API deben estar en el mismo sitio; de
  este modo no hace falta dominio propio ni CORS entre ambos.
- La tienda es quien llama al portal (`PORTAL_URL`): la PC no necesita puertos abiertos a internet.
- La app de portal mobile debe apuntar a la URL del portal; las de bodega, solo a la IP de la tienda.

## Requisitos

- Suscripción de Azure (Azure for Students sirve) y Azure CLI: `winget install -e --id Microsoft.AzureCLI`.
- `az login` hecho en la terminal donde se ejecuta el script.
- PowerShell 5.1 o superior (el de Windows).

## 1. Desplegar el portal

```powershell
.\deploy\azure\deploy.ps1
# región por defecto: westus3. Otra: -Location canadacentral | brazilsouth
```

El script crea el grupo de recursos `rg-karen`, el registro de contenedores (Basic), PostgreSQL
Flexible Server (Burstable B1ms, 32 GB), el entorno de Container Apps y la aplicación
(`min-replicas 1`, 0,5 vCPU, 1 GiB). Construye la imagen en Azure con
`deploy/azure/Dockerfile.portal`; no hace falta Docker local. Las migraciones las aplica
portal-api al arrancar.

Los secretos se generan una vez y se guardan en `deploy/azure/.secrets.karen.json` (ignorado por
git). **Guarda una copia fuera del equipo**: sin ella no puedes volver a iniciar sesión en la base
ni sincronizar la tienda.

Al terminar imprime la URL (`https://karen-portal.<id>.<región>.azurecontainerapps.io`) y los dos
valores para la tienda. Comprueba `https://<url>/readyz`: debe responder 200.

### Publicar una versión nueva

```powershell
.\deploy\azure\deploy.ps1 -UpdateOnly
```

Reconstruye la imagen con una etiqueta nueva y crea otra revisión de la aplicación.

## 2. Configurar la PC de la tienda

1. Instala Docker Desktop y activa *Start Docker Desktop when you sign in*.
2. Reserva una IP fija para la PC en el router.
3. Copia `deploy/tienda/.env.store.example` a `.env.store` en la raíz del proyecto y completa:
   `DB_PASSWORD`, `STORE_JWT_SECRET` (aleatorios y distintos entre sí), `STORE_SERVICE_KEY` y
   `PORTAL_URL` (los que imprimió el script) y `STORE_BIND` / `STORE_CORS_ORIGINS` con la IP fija.
4. Ejecuta `deploy\tienda\Iniciar-Karen.bat` (los contenedores tienen `restart: unless-stopped`,
   así que vuelven solos tras reiniciar la PC con Docker Desktop abierto).
5. Crea el administrador (ver *Primer usuario* en [operacion.md](operacion.md)).
6. Programa `deploy\tienda\Respaldar-Karen.bat` a diario con el Programador de tareas y copia
   `respaldos\` fuera de la PC.

Las apps de bodega usan `http://<STORE_BIND>:4000` como URL del servidor y deben estar en el Wi-Fi
de la tienda.

## Costos aproximados (verifícalos en la calculadora de Azure)

| Recurso | Mensual aprox. |
|---|---|
| PostgreSQL Flexible B1ms + 32 GB | 15–20 USD |
| Container Apps, 1 réplica siempre encendida | 8–10 USD |
| Container Registry Basic | 5 USD |
| Logs (Log Analytics) | casi 0 con poco tráfico |

El crédito de Azure for Students (100 USD) alcanza para unos 3–4 meses con esta configuración. Crea
una alerta de presupuesto en *Cost Management* antes de empezar. Para ahorrar, la base puede
pararse (`az postgres flexible-server stop`) cuando no se usa, y la Container App puede bajar a
`min-replicas 0`, a costa de que el primer cliente espere unos segundos.

## Seguridad

- La base acepta conexiones de «servicios de Azure» (regla `0.0.0.0`) porque Container Apps en el
  plan Consumption no tiene IP de salida fija. Está protegida por TLS (`DB_SSL=true`) y una
  contraseña aleatoria de 32 caracteres. Para restringirla por IP, agrega un NAT Gateway al entorno
  y autoriza solo esa IP.
- PostgreSQL Flexible Server no expone la API REST pública que tiene Supabase.
- Los secretos viven como *secrets* de Container Apps, no en la imagen.
- `TRUST_PROXY_HOPS=1` (el ingress de Container Apps es un proxy). Si los registros de acceso
  muestran la misma IP para todos los clientes, revisa ese valor.
- La aplicación se limita a una réplica porque el límite de tasa general se lleva en memoria de
  cada instancia (ver *Proxy inverso* en [operacion.md](operacion.md)).

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `The location is restricted from performing this operation` | Azure for Students limita las regiones y PostgreSQL no está habilitado en todas las permitidas (en `eastus2` y `southcentralus` falla). Borra el grupo (`az group delete --name rg-karen`) y repite con `-Location westus3`, `canadacentral` o `brazilsouth`. |
| `self-signed certificate in certificate chain` en los logs | El almacén de CA de Node no incluye la raíz del servidor. Como paso temporal, `az containerapp update -n karen-portal -g rg-karen --set-env-vars DB_SSL=no-verify` cifra sin verificar el certificado. |
| La aplicación reinicia en bucle | `az containerapp logs show -n karen-portal -g rg-karen --follow`. Suele ser una variable obligatoria mal escrita. |
| El login no mantiene la sesión | Se está abriendo el web desde otra URL que no es la de la Container App; `CORS_ORIGINS` solo acepta esa. |
