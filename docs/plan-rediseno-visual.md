# Plan de rediseño visual: "El pasillo de Karen"

Objetivo: que el portal web, el portal móvil y la app de bodega se sientan como una tienda de barrio con vida, no como un sistema institucional. Cercano, colorido, con movimiento que responde a lo que hace la persona.

Alcance: `frontend/portal-web-react`, `frontend/portal-mobile-reactnative`, `frontend/bodega-mobile-reactnative`. No toca backend ni reglas de negocio.

---

## 1. Punto de partida

Hoy existe un sistema llamado "Fleje" (la etiqueta de precio de la percha). La idea es buena y específica del negocio, y se conserva. Lo que lo hace sentir frío es cómo está ejecutado:

| Qué se ve hoy | Por qué se siente distante |
|---|---|
| Fondo gris `#EFF1F4`, texto azul marino `#13284B` | Paleta de informe corporativo |
| Botones primarios en azul marino, esquinas de 6 px | Parecen formularios, no una tienda |
| Titulares en Archivo Narrow condensada | Voz seca, de manual |
| Casi sin movimiento (65 usos de `transition`/`animate`, solo 3 animaciones propias) | La página no reacciona a la persona |
| Textos como "Reserva en línea y retira en caja sin hacer fila" | Describen el sistema, no hablan con el cliente |
| Modo oscuro resuelto con parches (`html.dark .text-ink:not(...)` y decenas de `dark:bg-slate-*`) | Cada color nuevo obliga a tocar muchos archivos |

Restricciones que no cambian:
- El logo es rojo `#CC1F26` aprox. con texto carbón sobre blanco. El rojo Karen `#D52B1E` se mantiene. El logo va sobre blanco o limón, nunca sobre morado.
- El semáforo de caducidad (Vencido, Rojo, Amarillo, Normal) es regla de negocio y se queda con su significado. Esos colores no se reutilizan como decoración.
- Los textos de los tests (`NewFeatures.test.tsx`, `ProductCatalog.test.tsx`, etc.) hay que actualizarlos junto con cada cambio de copy.

---

## 2. Dirección: el pasillo de colores

Cada sección del supermercado tiene su color, como los letreros de pasillo. La página se arma con bloques de color plano, pegatinas de oferta que se pegan con un golpe, y notas escritas a mano por la tienda. Fotos de producto sobre fondos de color en vez de tarjetas blancas.

Lo memorable (donde se gasta la audacia): **las ofertas son pegatinas** que se pegan una a una al cargar y vuelan a la canasta al agregarlas. El resto es disciplinado: bloques planos, poca decoración.

### 2.1 Color

| Nombre | Hex | Rol |
|---|---|---|
| Rojo Karen | `#D52B1E` | Marca, ofertas, acción principal |
| Limón | `#FFD400` | Pegatinas, resaltes, fondo del logo |
| Mora | `#2A1148` | Texto y bordes (reemplaza al azul marino) |
| Aguacate | `#0E7A43` | Confirmaciones, "en fecha", frescos |
| Naranjilla | `#FF7A1A` | Cuenta regresiva, avisos amables |
| Guayaba | `#FF9EB5` | Acento cálido, detalles de ilustración |
| Pasillo | `#F6F1FB` | Fondo de página (lila muy pálido, reemplaza al gris) |
| Mora noche | `#1B0B2E` | Fondo del modo oscuro |

Cada categoría de producto toma un color de fondo para su foto (lácteos limón, frutas naranjilla, verduras aguacate, carnes guayaba, etc.). Las fotos de Open Food Facts vienen con fondo blanco: se muestran con `mix-blend-mode: multiply` sobre el bloque de color para que el blanco desaparezca.

Contrastes calculados (WCAG, mínimo 4.5 para texto normal):

| Combinación | Ratio | Uso |
|---|---|---|
| Blanco sobre Rojo Karen | 5.01 | Botón principal |
| Mora sobre Limón | 11.53 | Pegatinas |
| Mora sobre Naranjilla | 6.33 | Cuenta regresiva |
| Mora sobre Guayaba | 8.50 | Etiquetas cálidas |
| Blanco sobre Aguacate | 5.41 | Confirmado |
| Rojo Karen sobre Pasillo | 4.51 | Precios de oferta |
| Blanco sobre Naranjilla | **2.61** | **No usar.** Siempre Mora sobre Naranjilla |

### 2.2 Tipografía

| Rol | Fuente | Uso |
|---|---|---|
| Voz principal | Bricolage Grotesque (800, ancho variable) | Titulares, precios, botones |
| Lectura | Nunito (400, 600, 700) | Párrafos, formularios, listas |
| Nota a mano | Caveat (700) | Solo notas de la tienda sobre ofertas, máximo una frase |
| Ticket | Doto (ya existe) | Solo el pase de retiro y sellos de fecha |

Escala: 14 / 16 / 18 / 24 / 36 / 56 / 80. Titulares con interlineado 0.95 y tracking -0.02em; el precio usa el ancho condensado de Bricolage para que quepa grande. Párrafos con máximo 60 caracteres por línea. Se elimina Archivo y Archivo Narrow.

### 2.3 Forma y profundidad

- Radios por rol, no uno para todo: pegatinas 14 px, botones 999 px (píldora), bloques de sección 28 px, fotos de producto 20 px.
- Sombra dura de pegatina: `3px 3px 0 var(--mora)`. Al presionar, el botón se hunde 2 px y la sombra se reduce. Sin sombras grises difusas.
- Bordes de 2 px en Mora solo en lo interactivo (botones, campos, pegatinas). Las tarjetas no llevan borde.
- Foco visible: anillo Limón de 3 px con borde Mora (ya existe, se mantiene).

### 2.4 Voz

Español de Ecuador, de tú, frases cortas, verbos concretos. Con la sesión iniciada se usa el nombre; sin sesión, el saludo depende de la hora en Guayaquil. Las notas a mano reutilizan el texto comercial que ya genera Gemini para las promociones aprobadas, así que la tienda "habla" con contenido real.

Errores: dicen qué pasó y qué hacer, sin disculparse ni dramatizar.

| Dónde | Hoy | Propuesta |
|---|---|---|
| Titular de portada | Reserva en línea y retira en caja sin hacer fila | Apártalo desde tu casa. Lo pagas cuando llegues. |
| Botón de portada | Ver productos | Armar mi lista |
| Oferta del día | Agregar oferta a mi lista | Apartar a $2,40 |
| Carrito vacío | (texto genérico) | Tu canasta está vacía. Mira qué se va hoy. |
| Reserva confirmada | (confirmación genérica) | ¡Apartado! Tienes 10 minutos para llegar a caja. |
| Reserva por vencer | (solo temporizador) | Quedan 2 minutos. Si no llegas, liberamos tus productos. |
| Tienda sin señal | Aviso preventivo del bloqueo | Por ahora no podemos apartar productos. Intenta de nuevo en un momento. |

---

## 3. Portada web

```
┌──────────────────────────────────────────────────────────────────────┐
│ [logo]   Productos  Ofertas  Mis reservas            ☀/☾   🧺 3     │  blanco
├──────────────────────────────────────────────────────────────────────┤
│  fondo LIMÓN, a ras de pantalla                                      │
│                                                                      │
│  Buenas tardes, Paola.            ┌───────┐ ┌───────┐                │
│  Apártalo desde tu casa.          │ -40%  │ │ -25%  │  pegatinas     │
│  Lo pagas cuando llegues.         │ yogur │ │ pan   │  que caen y se │
│                                   │ $2,40 │ │ $1,10 │  pegan con     │
│  [ Armar mi lista ]  Ofertas      └───────┘ └───────┘  rebote        │
│                                      ┌───────┐                       │
│  "Se acaba hoy" ── nota a mano ──▶   │ -50%  │                       │
│                                      └───────┘                       │
├──────────────────────────────────────────────────────────────────────┤
│  cinta que se desliza: Se va hoy · Yogur Toni · Pan de agua · ...    │  MORA
├──────────────────────────────────────────────────────────────────────┤
│  Pasillos (bloques de color por categoría, 4 columnas)               │
├──────────────────────────────────────────────────────────────────────┤
│  Cómo apartar: Elige · Aparta · Retira en caja  (sí es secuencia)    │
└──────────────────────────────────────────────────────────────────────┘
```

Alineación: texto a la izquierda, siempre. Pegatinas con rotación fija distinta (-4°, 2°, -1°) para parecer pegadas a mano, no aleatoria en cada carga. Los números 1-2-3 solo aparecen en "Cómo apartar", que sí es una secuencia.

---

## 4. Catálogo de movimiento

Un solo momento coreografiado al cargar, el resto responde a acciones. Nada de entradas "fade + slide up" en cada sección.

| Momento | Disparador | Qué pasa | Dónde |
|---|---|---|---|
| Pegatinas de la portada | Carga inicial (una vez) | 3 pegatinas caen, escalonadas 90 ms, con resorte | Web, móvil |
| Agregar a la lista | Clic o toque | El producto vuela a la canasta, la canasta rebota, el contador gira como odómetro | Web, móvil |
| Botones | Presionar | Se hunden 2 px y la sombra se achica | Todo |
| Cuenta regresiva de reserva | Cada segundo | Barra que se vacía; en los últimos 2 min pasa a Naranjilla con pulso lento | Pase de retiro |
| Reserva confirmada | Respuesta del servidor | Sello "¡Apartado!" se estampa (escala 1.4 a 1) y el ticket "se imprime" hacia abajo | Pase de retiro |
| Ahorro del carrito | Cambiar cantidades | Cifra "Ahorras $3,40" cuenta hasta el nuevo valor | Carrito |
| Descuento | Entrar a pantalla (una vez) | El badge hace "pop" | Ofertas |
| Cinta "Se va hoy" | Continuo | Desplazamiento lento; se pausa al pasar el cursor o enfocar | Portada web |
| Carga | Pendiente de datos | Esqueleto de color con brillo suave | Catálogo |
| Estado vacío | Sin datos | Ilustración que se balancea una vez | Carrito, reservas |
| Tema claro/oscuro | Clic | Transición circular desde el botón | Navbar |
| Chat de ayuda | Escribir | Tres puntos "escribiendo" antes de la respuesta | Chat |
| Confirmaciones | Éxito | Vibración corta | Móvil |

Reglas:
- Solo se animan `transform` y `opacity`.
- `prefers-reduced-motion`: se cambian los movimientos por apariciones instantáneas y se conserva la información (la cuenta regresiva sigue visible, sin pulso ni vuelo). La regla global que ya existe en `index.css` se mantiene y se complementa en la app móvil con `AccessibilityInfo.isReduceMotionEnabled`.
- Presupuesto: no más de 25 kB gzip extra en el portal web.

Librerías propuestas (verificar versión compatible con `npm view` antes de instalar):
- Web: `motion` (vuelo a la canasta y animaciones de layout). El resto con CSS y View Transitions.
- Móvil: `react-native-reanimated` y `expo-haptics`, instalados con `npx expo install` por la versión de Expo 57. Para el vuelo a la canasta se evalúa primero con `Animated` nativo y solo se añade Reanimated si no alcanza.
- Fuentes: `@expo-google-fonts/bricolage-grotesque`, `@expo-google-fonts/nunito`, `@expo-google-fonts/caveat`; en web, Google Fonts con `font-display: swap` y solo los pesos usados.

---

## 5. Implementación por fases

Cada fase va en su propia rama desde `develop` y con commits pequeños, como pide `CLAUDE.md`. Al terminar cada una: lint, tests, build, y capturas antes/después.

### Fase 0. Línea base (chore/visual-baseline)
- Capturar pantallas actuales de los tres clientes en claro y oscuro, en 390 px y 1280 px.
- Corregir el error de `HelpChatWidget.tsx:110` (`actionLabel:` en vez de `actionLabel =`) para partir con el lint limpio.

### Fase 1. Fundaciones (feature/visual-foundations)
Archivos: `portal-web-react/tailwind.config.js`, `src/index.css`, `index.html`; `*-mobile-reactnative/src/theme/tokens.ts`, `ThemeContext.tsx`, `App.tsx` (carga de fuentes).
- Pasar los colores a variables CSS (`@theme` de Tailwind 4) y redefinirlas en `.dark`. Se elimina el bloque `html.dark .text-ink:not(...)`.
- Mantener los nombres actuales (`karen`, `ink`, `sticker`, `aisle`, `fresh`) apuntando a los valores nuevos, para que la app cambie de aspecto sin reescribir cada componente. Añadir `naranjilla` y `guayaba`.
- Cargar las fuentes nuevas, retirar Archivo.
- Utilidades: sombra dura, pegatina, hundimiento al presionar, keyframes del catálogo.
- Hecho cuando: la app compila, los tests pasan y se ve el cambio de paleta y tipografía en las tres apps.

### Fase 2. Componentes base web (feature/visual-components)
Archivos: `components/ui/Tag.tsx`, `ProductTag.tsx`, `Navbar.tsx`, `Footer.tsx`; nuevos `ui/Button.tsx`, `ui/Sticker.tsx`.
- Botones en píldora con sombra dura, y un único componente `Button` para reemplazar los `className` repetidos.
- `ProductTag`: foto con `multiply` sobre el color de la categoría, precio grande en Bricolage, botón con animación de "en tu lista".
- Navbar: canasta con contador que gira; botón de tema con transición circular.
- Footer: color de bloque, horarios y sucursal en primer plano.

### Fase 3. Portada y ofertas (feature/visual-storefront)
Archivos: `HeroSection.tsx`, `FlashOffersSection.tsx`, `SpecialOffersSlider.tsx`, `CategoriesGrid.tsx`, `App.tsx`.
- Hero nuevo según el wireframe, con saludo por hora y por nombre.
- Pegatinas de oferta con la nota a mano de Gemini cuando exista.
- Cinta "Se va hoy" y pasillos por color.
- Sección "Cómo apartar" con los 3 pasos.
- Revisar `SpecialOffersSlider` (336 líneas): confirmar que su movimiento no compite con la cinta; si compiten, se queda solo uno.

### Fase 4. Flujo de reserva (feature/visual-reservation-flow)
Archivos: `CartDrawer.tsx`, `ReservationModal.tsx`, `MyReservationsPage.tsx`, `LoginModal.tsx`, `AntiOverbookingBanner.tsx`.
- Vuelo a la canasta, ahorro que cuenta, cuenta regresiva con tramo naranja.
- Pase de retiro: ticket que se imprime y sello "¡Apartado!". Es la pantalla que el cliente enseña en caja, así que se cuida la legibilidad del código `KR-XXXXXX` y del QR por encima de la animación.
- Mensajes de error y bloqueo por heartbeat con la voz nueva.

### Fase 5. Ayuda, textos legales y vacíos (feature/visual-help-and-empty-states)
Archivos: `HelpChatWidget.tsx`, `TermsModal.tsx`, estados vacíos.
- Chat con "escribiendo", burbujas con la forma de la tienda.
- 6 a 8 ilustraciones SVG propias: canasta vacía, sin reservas, sin conexión, sin resultados, reserva expirada, agradecimiento.
- `TermsModal` solo recibe tipografía y color; el contenido legal no se reescribe.

### Fase 6. Portal móvil (feature/visual-mobile-portal)
Archivos: `src/screens/*`, `src/components/*` (incluye `PickupPassModal.tsx`, `ProductTag.tsx`, `CartDrawerMobile.tsx`, `NavbarMobile.tsx`).
- Mismo sistema que la web, con las animaciones del catálogo y vibración en confirmaciones.
- Objetivo de rendimiento: 60 fps en un Android de gama baja; probar con el modo de rendimiento de Expo en un dispositivo real.

### Fase 7. App de bodega (feature/visual-bodega)
Archivos: `screens/*`, `components/*` (`LotLabel.tsx`, `TabNavBodega.tsx`, `HeaderBodega.tsx`, `ui.tsx`).
- Mismos colores y tipografía, con menos juego: es herramienta de trabajo con escáner y guantes.
- Zonas táctiles de al menos 48 px, el semáforo FEFO sin cambios de significado y siempre con su texto ("Crítico", "Preventivo", "En fecha"), no solo color.
- Movimiento solo funcional: alerta nueva que entra por SSE con un destello, lote guardado con sello.
- Lenguaje cercano también aquí: "Guardaste el lote" en lugar de "Operación exitosa".

### Fase 8. Cierre (chore/visual-qa)
- Contraste revisado en cada pareja nueva y en modo oscuro.
- Navegación por teclado y lector de pantalla en carrito, reserva y pase de retiro.
- Con `prefers-reduced-motion` activo, recorrer todo el flujo.
- Rendimiento: Lighthouse del portal web (objetivo móvil 90+), tamaño del bundle frente al presupuesto.
- `npm test`, `npm run lint`, `npm run build` en web; `npm test`, `npm run typecheck` y `npx expo export --platform android` en las dos apps móviles.
- Actualizar `diseno_interfaces.md` con el nuevo sistema.

---

## 6. Revisión contra el brief

El primer borrador de este plan cayó en patrones genéricos. Estos son los cambios:

| Primer borrador | Problema | Cambio |
|---|---|---|
| Fondo crema con acento terracota y serif de contraste | Es el aspecto por defecto de lo generado, y el terracota se parece al color de interacción de Claude | Fondo lila pálido, paleta de frutas (Mora, Limón, Aguacate, Naranjilla, Guayaba) y rojo de la marca real |
| Todo en tarjetas redondeadas con sombra gris suave | Aspecto de plantilla SaaS | Bloques de color planos, radios distintos por rol, sombra dura de pegatina |
| Etiquetas en mayúsculas sobre cada sección | Relleno tipográfico | Se eliminan; los titulares hablan solos |
| Numeración 01/02/03 en varias secciones | Decorativa | Solo en "Cómo apartar", que sí es una secuencia |
| Entrada animada en cada sección al hacer scroll | Efecto genérico | Una sola secuencia al cargar y movimiento que responde a acciones |
| Mascota ilustrada para dar calidez | Difícil de sostener y fácil de caer en lo infantil | Calidez desde la voz, las notas a mano y los colores; sin mascota |

Riesgos y decisiones abiertas:
- **Notas de Gemini en las pegatinas**: solo se muestran promociones aprobadas, nunca borradores pendientes.
- **"Hoy se apartaron N canastas"** u otra prueba social requeriría un endpoint nuevo y datos reales; queda fuera de este plan.
- **Caveat**: si en pruebas la letra a mano resta legibilidad o se siente pesada, se retira y la nota pasa a Nunito 700 con inclinación.
- **Fuentes**: confirmar que los tres paquetes de `@expo-google-fonts` existen en la versión que acepta Expo 57 antes de la Fase 1.
- **Logo**: el color carbón del logo no coincide exactamente con Mora; se acepta porque el logo siempre va sobre blanco o Limón y no convive en el mismo bloque con textos en Mora.
