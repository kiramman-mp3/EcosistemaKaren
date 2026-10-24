# Arquitectura de Software - Ecosistema Karen (Fase 1)

Este documento describe los principios de **Clean Architecture (Arquitectura Limpia)**, patrones de diseño y flujo de datos implementados en el servidor Backend del **Supermercado Karen**.

---

## 1. Principios y Filosofía de Diseño

El sistema está diseñado de afuera hacia adentro, garantizando la **Regla de Dependencia**: *Las capas internas nunca dependen de las capas externas*.

```mermaid
graph TD
    subgraph Infraestructura ["Capas Exteriores (Infraestructura)"]
        Express["Express Server / HTTP"]
        Postgres["Base de Datos PostgreSQL (pg)"]
        GeminiAPI["Google Gemini API SDK"]
        SSE["AlertStreamManager (SSE)"]
    end

    subgraph Adaptadores ["Capa de Adaptadores (Adapters)"]
        Controllers["HTTP Controllers"]
        Repositories["Postgres Repositories"]
        AIAdapter["GeminiAdapter"]
    end

    subgraph Aplicacion ["Capa de Aplicación (Use Cases)"]
        UC1["ReservarStockUseCase (FEFO + TTL)"]
        UC2["IngresarLoteUseCase"]
        UC3["ObtenerAlertasCaducidadUseCase"]
        UC4["GenerarPromocionesIAUseCase"]
    end

    subgraph Dominio ["Capa Núcleo (Domain)"]
        Entidades["Entidades: Producto, Lote, Reserva, Usuario"]
        Exceptions["DomainException"]
    end

    Express --> Controllers
    Controllers --> Aplicacion
    Aplicacion --> Dominio
    Repositories --> Dominio
    AIAdapter --> Aplicacion
    Postgres --> Repositories
    GeminiAPI --> AIAdapter
```

---

## 2. Descripción de Capas

### 2.1. Capa de Dominio (`/src/domain`)
* **Propósito**: Contiene el modelo mental y las reglas de negocio indispensables del Supermercado Karen.
* **Componentes**:
  * `Producto.js`: Entidad con reglas de validación de código de barras y precios.
  * `Lote.js`: Entidad núcleo que calcula días para caducar y aplica la política única: `VENCIDO` ≤ 0d, `ROJO` 1–6d, `AMARILLO` 7–14d y `NORMAL` ≥ 15d; además gestiona stock disponible, reservado y mermas.
  * `Reserva.js`: Entidad que administra el ciclo de vida de la reserva temporal, generación de PIN de cobro en caja SIACI y temporizador TTL (30 minutos).
  * `DomainException.js`: Excepción base de negocio.
* **Regla**: No importa ninguna librería externa ni cliente de base de datos.

### 2.2. Capa de Aplicación (`/src/use-cases`)
* **Propósito**: Orquesta el flujo de datos hacia y desde las entidades del dominio para cumplir los requerimientos del sistema.
* **Componentes**:
  * `ReservarStock.js`: Algoritmo Anti-Overbooking. Asigna stock ordenando lotes mediante **FEFO** (*First Expired, First Out*), reserva las unidades y genera la reserva con TTL.
  * `IngresarLote.js`: Registra nuevos lotes y emite notificaciones SSE inmediatas si el producto ingresado caduca pronto.
  * `ObtenerAlertasCaducidad.js`: Filtra lotes activos que caducan en menos de 15 días.
  * `GenerarPromocionesIA.js`: Analiza lotes de baja rotación invocando al adaptador de IA.

### 2.3. Capa de Adaptadores (`/src/adapters`)
* **Propósito**: Convierte los datos entre el formato conveniente para los casos de uso y el formato conveniente para agentes externos (HTTP, SQL, APIs de terceros).
* **Componentes**:
  * `controllers/`: Traduce peticiones HTTP Express a ejecuciones de Casos de Uso.
  * `db/`: Implementaciones concretas de repositorios mediante SQL nativo (`PostgresProductRepository`, `PostgresLotRepository`, `PostgresReservationRepository`).
  * `ai/GeminiAdapter.js`: Adaptador para la API de Gemini que genera copys y porcentajes de descuento con optimización de tokens y fallback determinístico.

### 2.4. Capa de Infraestructura (`/src/infrastructure`)
* **Propósito**: Aloja los frameworks, drivers, servidores y procesos de fondo.
* **Componentes**:
  * `http/`: Servidor Express, enrutador `/api/v1` y middleware centralizado de manejo de errores.
  * `sse/AlertStreamManager.js`: Canal de Server-Sent Events que empuja alertas en tiempo real hacia las aplicaciones frontend conectadas.
  * `workers/ReservationCleanerWorker.js`: Sweeper background que se ejecuta periódicamente liberando stock de reservas cuyos 30 minutos de TTL hayan expirado.

---

## 3. Patrones de Diseño Aplicados

1. **FEFO (First Expired, First Out)**: Las reservas asignan preferentemente el stock de lotes cuya fecha de caducidad sea más próxima, reduciendo el desperdicio por merma.
2. **Anti-Overbooking con TTL**: El inventario disponible se descuenta al instante en el carrito y se transfiere a stock reservado durante 30 minutos. Si la compra no se confirma en caja SIACI, un proceso background sweeper restaura automáticamente las unidades a stock libre.
3. **Event-Driven real-time (SSE)**: En lugar de polling pesado desde el frontend, el backend notifica al cliente movil de bodegueros al instante mediante conexiones `text/event-stream`.
4. **Heartbeat y cola de comandos saliente**: La tienda inicia toda la comunicación hacia la nube. Envía un latido periódico al portal y consulta por long-poll los comandos de reserva pendientes, de modo que no hace falta exponer la red local (ver sección 4).

---

## 4. Topología de despliegue

El backend está separado en dos servicios con base de datos propia, según [ADR-003](docs/decisions/ADR-003-split-store-portal.md). Ambos reutilizan el mismo `domain` y `use-cases`; cada uno tiene su propia raíz de composición (`src/apps`), su propio enrutador y su propia documentación Swagger. Un monolito de transición (`npm start`) los une en un solo proceso y una sola base para desarrollo sencillo.

```mermaid
graph LR
    Cliente["Portal web / móvil (CLIENTE)"] -->|HTTPS| Portal
    Trabajador["Bodega móvil (BODEGUERO, PERCHERO, ADMIN)"] -->|LAN| Store

    subgraph Nube
        Portal["portal-api"] --- PortalDB[("PostgreSQL portal")]
    end

    subgraph Tienda ["Red local de la tienda"]
        Store["store-api"] --- StoreDB[("PostgreSQL tienda")]
        Store --> Gemini["Gemini API"]
    end

    Store -->|"heartbeat, catálogo, eventos, resultados"| Portal
    Store -->|"long-poll de comandos de reserva"| Portal
```

* **store-api** es la única autoridad de inventario y reservas (FEFO, anti-overbooking, caja, alertas SSE, Gemini y aprobación de promociones).
* **portal-api** autentica clientes, sirve una copia de lectura del catálogo, recibe las reservas como `PENDIENTE_SYNC` y bloquea nuevas reservas si no hay heartbeat vigente de la tienda.
* Todo el tráfico entre ambos es saliente desde la tienda, bajo `/internal/v1` con API key de servicio (cabecera `x-store-key`).

### Qué viaja entre los servicios

| Sentido | Qué | Cómo |
|---|---|---|
| tienda → portal | Latido de la tienda | `POST /internal/v1/store/heartbeat` periódico; el portal bloquea reservas sin latido vigente |
| tienda → portal | Catálogo, disponibilidad y promociones aprobadas | Snapshots por sección, solo cuando cambian (`POST /internal/v1/store/sync/catalog`) |
| tienda ← portal | Reservas de los clientes | Cola durable de comandos en el portal, pedida por long-poll (`GET /internal/v1/store/commands`) |
| tienda → portal | Resultado de cada comando y cambios de estado (confirmada, expirada) | Bandeja de salida con reintentos (`outbox_portal`) hacia `/commands/:id/result` y `/events` |

La tienda sigue operando sin internet: solo se detienen la sincronización y la atención de reservas nuevas, y se reanudan al volver la conexión.
