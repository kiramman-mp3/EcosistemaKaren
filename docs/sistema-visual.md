# Sistema visual: "El pasillo de Karen"

Guía de la identidad visual vigente en el portal web, el portal móvil y la app de bodega. El plan original está en [plan-rediseno-visual.md](plan-rediseno-visual.md); este documento describe cómo quedó construido.

## Idea

Cada sección del supermercado tiene su color, como los letreros de pasillo. Las pantallas se arman con bloques de color plano, pegatinas con sombra dura y notas escritas a mano. Lo memorable son las pegatinas de oferta: se pegan con rebote al abrir la portada y vuelan a la canasta al agregarlas.

## Colores

| Nombre | Hex | Uso |
|---|---|---|
| Rojo Karen | `#D52B1E` | Marca, ofertas, acción principal |
| Limón | `#FFD400` | Pegatinas, estado activo, encabezados |
| Mora | `#2A1D14` | Texto, bordes y sombra dura (café casi negro) |
| Aguacate | `#0E7A43` | Confirmaciones y bloques con texto blanco |
| Naranjilla | `#FF7A1A` | Contadores y avisos amables; siempre con texto Mora |
| Guayaba | `#FF9EB5` | Acentos cálidos |
| Pasillo | `#FBF6EC` | Fondo de página (crema) |
| Mora noche | `#1C1612` | Fondo del modo oscuro |

Reglas:
- **La app arranca en modo claro** y no sigue la preferencia del sistema; el modo oscuro es una elección de la persona y se recuerda. Las superficies grandes (encabezados, cinta de ofertas, pie de página) son blancas con borde Mora, no bloques oscuros.
- **Los neutros son cálidos (crema y café), nunca morados.** La marca la llevan el rojo Karen y el limón; fondo, texto y sombras solo los acompañan.
- **Blanco sobre Naranjilla no pasa contraste (2.61).** Con Naranjilla siempre texto Mora.
- Los colores del semáforo de caducidad (vencido, rojo, amarillo, normal) son regla de negocio. No se usan como decoración.
- El logo va siempre sobre una placa blanca, también en modo oscuro.
- El papel del pase de retiro es siempre blanco con tinta Mora, para que se imprima y se escanee igual en ambos modos.

Contrastes verificados (WCAG, mínimo 4.5): texto Mora sobre Limón 11.53, blanco sobre Rojo Karen 5.01, blanco sobre Aguacate 5.41, Mora sobre Naranjilla 6.33, Mora sobre Guayaba 8.50, y los pares del modo oscuro entre 5.91 y 9.96.

## Tipografía

| Rol | Fuente | Uso |
|---|---|---|
| Voz principal | Bricolage Grotesque 800 | Titulares, precios, botones |
| Lectura | Nunito 400, 600, 700 | Párrafos, formularios, listas |
| Nota a mano | Caveat 700 | Solo la nota de la tienda en una oferta |
| Ticket | Doto | Pase de retiro y fechas de vencimiento |

## Cómo se aplica en el código

### Portal web (`frontend/portal-web-react`)
- Los colores son variables CSS (`--c-*` en `src/index.css`) con su par oscuro en `:root.dark`. Los componentes usan nombres (`bg-surface`, `text-ink`, `bg-limon`) y **no llevan variantes `dark:`**.
- `karen` es el rojo de marca fijo (fondos); `karen-text` cambia en modo oscuro para tener contraste como texto. `aguacate-solid` es el verde fijo para fondos con texto blanco.
- Componentes base: `ui/Button` (píldora con sombra dura), `ui/Sticker`, `ui/Tag` (`Price`, `ProductImage`, `ExpiryStamp`), `ui/RollingNumber`, `ui/CountUp`, `ui/Illustration`.
- Cada categoría toma un color de pasillo con `lib/categoryTone.ts`.

### Apps móviles (`frontend/*-mobile-reactnative`)
- `src/theme/tokens.ts` define `lightColors` y `darkColors`. `colors` es un proxy que lee el modo activo, y `themed(() => StyleSheet.create({...}))` vuelve a crear los estilos al cambiar el tema. Así no hace falta repetir `isDark && {...}` en cada componente.
- `ThemeProvider` fija el modo durante el render, antes de que los hijos lean `colors`.
- Texto sobre un fondo de color fijo (Limón, Naranjilla, Rojo Karen) usa `colors.mora` o `'#FFFFFF'`, nunca `colors.ink` ni `colors.white`, porque esos cambian en modo oscuro.

## Movimiento

Hay una sola secuencia al cargar la portada; el resto responde a acciones de la persona.

| Momento | Disparador | Web | Móvil |
|---|---|---|---|
| Pegatinas de la portada | Carga inicial | `animate-sticker-slap` | `Slap` |
| Agregar a la lista | Toque | Vuelo a la canasta (`lib/flyToCart.ts`) y contador que gira | La canasta rebota (`Bump`) y vibra |
| Botones | Presionar | Se hunden 2 px (`.press`) | `PopPressable` |
| Cuenta regresiva | Cada segundo | Barra que se vacía; tramo naranja con pulso en los últimos 2 min | `Pulse` |
| Reserva confirmada | Respuesta del servidor | Sello "¡Apartado!" y ticket que se imprime | `Stamp` y vibración |
| Ahorro del carrito | Cambiar cantidades | `CountUp` | Cifra directa |
| Tema claro/oscuro | Clic | Transición circular (View Transitions) | Cambio inmediato |
| Chat | Escribir | Tres puntos "escribiendo" | n/a |

Reglas:
- Solo se animan `transform` y `opacity`.
- `prefers-reduced-motion` (web) y "reducir movimiento" del sistema (móvil) cambian los movimientos por apariciones instantáneas. La cuenta regresiva sigue visible.
- La cinta "Se va hoy" se pausa al pasar el cursor o enfocarla.
- En la app de bodega el movimiento es solo funcional: botones que se hunden, sello al guardar y rebote de la insignia de lotes críticos.

## Voz

Español de Ecuador, de tú, frases cortas y verbos concretos. Con la sesión iniciada se usa el nombre; sin sesión, el saludo depende de la hora en Guayaquil. Los errores dicen qué pasó y qué hacer, sin disculparse.

## Verificación

Lighthouse del portal web (móvil, `vite preview`): rendimiento 98, accesibilidad 100, mejores prácticas 96, LCP 2.4 s, CLS 0.038. Las fuentes se cargan sin bloquear el primer render y la portada reserva el espacio de las ofertas mientras llegan, para que no se mueva.
