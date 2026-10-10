# Especificación de Separación de Interfaces y Mockups - Ecosistema Karen (Fase 1)

Este documento define la arquitectura de separación del canal de usuario entre la **Aplicación Local de Tienda (Back-Office & Caja)** y el **Portal Web Público de Clientes (Canal Omnicanal)**, detallando la distribución de funcionalidades, la experiencia de usuario (UX) y los wireframes/mockups de pantalla para cada sistema.

---

## 1. Arquitectura de Separación de Canales

```
                                  ┌─────────────────────────────────────────┐
                                  │      Servidor Central / API REST        │
                                  │   (Express + PostgreSQL + Gemini IA)    │
                                  └────────────────────┬────────────────────┘
                                                       │
                       ┌───────────────────────────────┴───────────────────────────────┐
                       │                                                               │
                       ▼                                                               ▼
┌──────────────────────────────────────────────┐              ┌──────────────────────────────────────────────┐
│    Aplicación Local (Back-Office & Caja)     │              │    Portal Web de Clientes (Omnicanal PWA)    │
│  • Uso interno en red LAN de tienda          │              │  • Uso público desde cualquier navegador/móvil│
│  • Personal de Bodega, Percha y Cajeros      │              │  • Clientes finales del supermercado         │
│  • PWA optimizada para escáner y teclado     │              │  • PWA móvil con reservaciones Anti-Overbook │
└──────────────────────────────────────────────┘              └──────────────────────────────────────────────┘
```

---

### 1.1. Aplicación Local de Tienda (Back-Office Local & Caja)
* **Usuarios**: Personal de Bodega (Nancy Alvares, Luis Guachimboza), Cajeros (Ricardo Rodríguez, Guillermo Barreno, Karen Flores) y Gerencia.
* **Entorno**: Red LAN local de la tienda física (servidor de contingencia).
* **Propósito**: Gestión rigurosa del inventario bajo la relación **Producto → Lote → Caducidad**, trazabilidad **FEFO**, notificaciones en vivo SSE para percheros y validación de cobros en caja SIACI.
* **Características de UX/UI**:
  * Alta densidad de información, tablas compactas y controles accesibles por teclado o lectores de código de barras.
  * Colores de alerta contrastados por semáforo de caducidad (**Vencido** ≤ 0 días, **Rojo** 1–6 días, **Amarillo** 7–14 días y **Normal/Verde** ≥ 15 días).
  * Funcionamiento garantizado ante caídas de Internet externo.

---

### 1.2. Portal Web Público de Clientes (Canal Omnicanal)
* **Usuarios**: Clientes finales del Supermercado Karen.
* **Entorno**: Nube pública (accesible desde smartphones, tablets y laptops).
* **Propósito**: Exhibir ofertas relámpago, promociones generadas con Gemini AI y permitir la reserva de stock temporal anti-overbooking sin riesgo de sobreventa.
* **Características de UX/UI**:
  * Diseño moderno, visual, limpio y responsivo (Mobile-First).
  * Temporizador de cuenta regresiva TTL (10 minutos) para retiro en caja.
  * Indicador de latido de red (**Heartbeat**): si el servidor local de la tienda no emite señal en 60s, el portal bloquea automáticamente el checkout online con un mensaje de aviso preventivo.

---

## 2. Descripción de Pantallas y Wireframes (Mockups)

---

### 2.1. APLICACIÓN LOCAL DE TIENDA (Back-Office & Caja)

#### 🖥️ Pantalla L-01: Tablero de Bodega e Ingreso de Mercadería por Lotes
* **Audiencia**: Personal de Bodega (Nancy / Luis).
* **Funcionalidad**: Captura rápida de nuevos lotes recibidos de proveedores con lector de barra EAN y fecha de expiración.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🛒 ECOSISTEMA KAREN - BACK-OFFICE LOCAL                      [LAN: 192.168.1.50 - OK]  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [📦 Ingreso Lotes]   [🚨 Alertas Caducidad]   [🧾 Caja SIACI]   [🤖 Asistente IA]     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  ➕ REGISTRO ÁGIL DE LOTE RECIBIDO EN BODEGA                                           │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Código de Barras / EAN: [ 7861000100011        ] [🔍 Escanear]                   │  │
│  │ Producto:               Leche Entera Vita 1 Litro                                │  │
│  │ Número de Lote:         [ LOT-VT-2026-99    ]                                    │  │
│  │ Fecha de Caducidad:     [ 2026-09-25        ] (Quedan 11 días - AMARILLO)         │  │
│  │ Cantidad Ingresada:     [ 100              ] unidades                            │  │
│  │ Ubicación Inicial:      (o) BODEGA   ( ) PERCHA                                  │  │
│  │                                                                                  │  │
│  │                         [ 💾 GUARDA E INGRESAR A INVENTARIO ]                     │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                        │
│  📋 LOTES RECIENTES REGISTRADOS EN BODEGA                                             │
│  ┌──────────────┬───────────────┬────────────┬─────────────┬───────────┬────────────┐  │
│  │ Lote N°      │ Producto      │ Caducidad  │ Días Rest.  │ Stock     │ Ubicación  │  │
│  ├──────────────┼───────────────┼────────────┼─────────────┼───────────┼────────────┤  │
│  │ LOT-YG-2026  │ Yogurt Griego │ 2026-09-18 │ 4 días 🔴   │ 45 un.    │ PERCHA     │  │
│  │ LOT-VT-2026  │ Leche Vita 1L │ 2026-09-26 │ 12 días 🟡  │ 90 un.    │ BODEGA     │  │
│  └──────────────┴───────────────┴────────────┴─────────────┴───────────┴────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

#### 🖥️ Pantalla L-02: Consola de Alertas de Caducidad & Notificaciones SSE
* **Audiencia**: Percheros y Bodegueros.
* **Funcionalidad**: Pantalla táctil de monitoreo que emite notificaciones SSE push instantáneas. Alerta de mercadería crítica e integra botón para invocar la IA de Gemini.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🚨 MONITOREO DE ALERTAS EN TIEMPO REAL (SSE LIVE)                    [ 🟢 STREAM OK ] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  🔴 ALERTAS CRÍTICAS DE CADUCIDAD (< 7 DÍAS PARA VENCER)                               │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │  ⚠️ Yogurt Griego Toni 500g | Lote: LOT-YG-2026-01 | Quedan: 4 DÍAS               │  │
│  │  Ubicación: PERCHA | Disponible: 45 unidades | Expiración: 18/Sep/2026             │  │
│  │  [ 🚚 Mover a Percha ]   [ ⚡ GENERAR PROMOCIÓN CON GEMINI IA ]   [ ⚠️ Dar Merma ]  │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                        │
│  🟡 ALERTAS DE ADVERTENCIA (< 15 DÍAS PARA VENCER)                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │  🔔 Leche Entera Vita 1 Litro | Lote: LOT-VT-2026-02 | Quedan: 12 DÍAS            │  │
│  │  Ubicación: BODEGA | Disponible: 90 unidades | Expiración: 26/Sep/2026             │  │
│  │  [ 🚚 Mover a Percha ]   [ ⚡ GENERAR PROMOCIÓN CON GEMINI IA ]                     │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

#### 🖥️ Pantalla L-03: Módulo de Caja SIACI - Validación de Código PIN de Reserva
* **Audiencia**: Personal de Caja (Ricardo / Guillermo / Karen).
* **Funcionalidad**: El cliente entrega el código `KR-XXXXXX` en caja; el cajero valida la reserva en pantalla y presiona cobro para descontar stock en firme.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🧾 CAJA SIACI - VALIDACIÓN Y COBRO DE RESERVA WEB                                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  INGRESE CÓDIGO PIN DE RETIRO DE LA RESERVA:                                           │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │  PIN RETIRO: [  KR-X7Y9Z2  ]                         [ 🔍 VALIDAR PIN EN CAJA ]  │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                        │
│  DETALLES DE LA RESERVA ENCONTRADA:                                                    │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Estado: PENDIENTE DE COBRO (Expira en 06m 32s)                                  │  │
│  │  Cliente: Demo User (cliente@karen.com)                                           │  │
│  │                                                                                  │  │
│  │  ITEMS RESERVADOS:                                                               │  │
│  │  • 2x Yogurt Griego Toni 500g   @ $2.50 c/u  (Lote: LOT-YG-2026 - FEFO)           │  │
│  │  • 1x Leche Entera Vita 1L      @ $0.95 c/u  (Lote: LOT-VT-2026 - FEFO)           │  │
│  │                                                                                  │  │
│  │  TOTAL A COBRAR EN CAJA: $5.95 USD                                               │  │
│  │                                                                                  │  │
│  │                   [ 💰 CONFIRMAR RETIRO Y COBRAR EN CAJA ]                        │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.2. PORTAL WEB DE CLIENTES (Canal Omnicanal PWA)

#### 📱 Pantalla C-01: Landing Page & Catálogo de Ofertas (Vista Móvil)
* **Audiencia**: Clientes finales navegando desde smartphone o desktop.
* **Funcionalidad**: Visualización de ofertas vigentes, filtro de productos y barra de latido de red física.

```text
┌────────────────────────────────────────┐
│ 🛒 SUPERMERCADO KAREN      [🟢 Tienda] │
├────────────────────────────────────────┤
│  🔥 ¡Ofertas del Día por Caducidad!    │
│  Aprovecha descuentos en productos    │
│  frescos con reserva garantizada.      │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ 🥛 Leche Entera Vita 1 Litro       │ │
│ │ Price: $0.95                       │ │
│ │ Stock Disponible: 90 unidades      │ │
│ │ Próxima Caducidad: 26/Sep          │ │
│ │                                    │ │
│ │ [ 🎟️ Reservar Stock Anti-Overb ]   │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ 🍨 Yogurt Griego Toni 500g         │ │
│ │ Price: $2.50  (35% OFF Gemini IA) │ │
│ │ Stock Disponible: 45 unidades      │ │
│ │ Próxima Caducidad: 18/Sep (4 días) │ │
│ │                                    │ │
│ │ [ 🎟️ Reservar Stock Anti-Overb ]   │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

---

#### 📱 Pantalla C-02: Pase Digital de Reserva (PIN / QR con TTL 10 min)
* **Audiencia**: Cliente final tras presionar "Confirmar Reserva".
* **Funcionalidad**: Emisión del código PIN `KR-XXXXXX` junto a un código QR e instrucciones para presentar en caja SIACI antes de la expiración del TTL.

```text
┌────────────────────────────────────────┐
│ 🎟️ PASE DE RESERVA DE STOCK            │
├────────────────────────────────────────┤
│                                        │
│  ¡Reserva Realizada con Éxito!         │
│  Presenta este código en Caja SIACI    │
│  para pagar y retirar tu compra.       │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │      PIN:   KR-X7Y9Z2            │  │
│  │                                  │  │
│  │      [ █▀▀▀▀▀█ ▀ █▀▀▀▀▀█ ]       │  │
│  │      [ █ ███ █ █ █ ███ █ ]       │  │
│  │      [ █▄▄▄▄▄█ █ █▄▄▄▄▄█ ]       │  │
│  │      [ ▀▀▀▀▀▀▀ ▀ ▀▀▀▀▀▀▀ ]       │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ⏱️ TIEMPO RESTANTE DE RESERVA:        │
│             09m:45s                    │
│                                        │
│  (Si la reserva expira, el stock       │
│   se devolverá a tienda física)        │
│                                        │
│  [ 🏠 Volver al Catálogo ]             │
└────────────────────────────────────────┘
```

---

## 3. Resumen Comparativo de Interfaces

| Característica | Aplicación Local (Back-Office & Caja) | Portal Web de Clientes (Omnicanal) |
| :--- | :--- | :--- |
| **Audiencia** | Bodegueros, Percheros y Cajeros | Clientes finales del Supermercado |
| **Dispositivo** | PCs de bodega/caja, Pantalla táctil LAN | Smartphones, Tablets, Laptops (Web) |
| **Autenticación** | Login con Rol (`BODEGUERO`, `PERCHERO`, `ADMIN`) | Acceso libre / Login de cliente |
| **Acceso a Datos** | CRUD completo de Lotes, Productos y Mermas | Solo Lectura de Catálogo y Creación de Reservas |
| **Notificaciones** | Real-time SSE Stream (ROJO 1–6d, AMARILLO 7–14d) | Toasts de confirmación de reserva |
| **Algoritmos** | Registro por Lotes, FEFO, Sweeper de mermas | Asignación FEFO transparente + Temporizador TTL |
| **Resiliencia** | Opera 100% offline si falla el Internet externo | Se bloquea si se pierde el **Heartbeat** de la tienda física |
