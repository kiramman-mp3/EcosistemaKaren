// Contrato de sincronización de catálogo store-api -> portal-api (ADR-003).
// Cada sección es un snapshot completo de una tabla pública: el portal reemplaza su copia.
// Solo se publican los campos que los clientes pueden ver; costos, ubicaciones, fechas de
// elaboración, existencias reservadas y metadatos de IA nunca salen de la tienda.
//
// `key` es el nombre en el payload JSON, `column` la columna de la tabla y `sql` su tipo.
// Una sección se completa con `fixed`: columnas del espejo que el portal fija por sí mismo.
// Un campo `optional` puede faltar (lo envía una tienda con una versión anterior): el espejo
// conserva el valor que ya tenía o, si la fila es nueva, usa `fallback` (una expresión SQL).

const field = (key, column, sql, extra = {}) => ({ key, column, sql, ...extra });
const offerLimit = (min) => ({ min, max: 100000, nullable: true, optional: true, fallback: 'NULL' });

const SECTIONS = {
  categorias: {
    table: 'categorias',
    fields: [
      field('id', 'id', 'uuid'),
      field('nombre', 'nombre', 'text', { max: 100 }),
      field('descripcion', 'descripcion', 'text', { max: 2000, nullable: true })
    ]
  },
  productos: {
    table: 'productos',
    touchUpdatedAt: true,
    fields: [
      field('id', 'id', 'uuid'),
      field('categoriaId', 'categoria_id', 'uuid'),
      field('codigoBarras', 'codigo_barras', 'text', { max: 50 }),
      field('nombre', 'nombre', 'text', { max: 150 }),
      field('descripcion', 'descripcion', 'text', { max: 2000, nullable: true }),
      field('precioVenta', 'precio_venta', 'numeric', { min: 0.01, max: 1000000 }),
      field('impuestoPorcentaje', 'impuesto_porcentaje', 'numeric', { min: 0, max: 100 }),
      field('imagenUrl', 'imagen_url', 'text', { max: 500, nullable: true }),
      // Alta real del producto en la tienda (filtro "Nuevos") y unidades vendidas en los últimos
      // 30 días (filtro "Más vendidos"). Esta cifra cambia con cada venta, así que la sección se
      // reenvía más a menudo; con unos cientos de productos sigue pesando poco.
      field('createdAt', 'created_at', 'timestamptz', { optional: true, fallback: 'CURRENT_TIMESTAMP' }),
      field('vendidos30d', 'vendidos_30d', 'int', { min: 0, max: 100000000, optional: true, fallback: '0' })
    ]
  },
  lotes: {
    table: 'lotes',
    touchUpdatedAt: true,
    fields: [
      field('id', 'id', 'uuid'),
      field('productoId', 'producto_id', 'uuid'),
      field('numeroLote', 'numero_lote', 'text', { max: 50 }),
      field('fechaCaducidad', 'fecha_caducidad', 'date'),
      field('cantidadIngresada', 'cantidad_ingresada', 'int', { min: 0, max: 100000000 }),
      field('cantidadDisponible', 'cantidad_disponible', 'int', { min: 0, max: 100000000 })
    ],
    fixed: [['estado', "'ACTIVO'"]]
  },
  promociones: {
    table: 'promociones_ia',
    fields: [
      field('id', 'id', 'uuid'),
      field('loteId', 'lote_id', 'uuid'),
      field('descuentoPorcentaje', 'descuento_porcentaje', 'numeric', { min: 1, max: 90 }),
      field('frasePromocional', 'frase_promocional', 'text', { max: 180 }),
      field('createdAt', 'created_at', 'timestamptz'),
      // Límites que fija el ADMIN y unidades de oferta que quedan (las calcula la tienda); null = sin
      // tope. Si faltan se conserva el valor previo: no hay confusión con "sin tope" porque los límites
      // no cambian tras aprobar la oferta y las restantes solo son null cuando no hay stock de oferta.
      field('limitePorPedido', 'limite_por_pedido', 'int', offerLimit(1)),
      field('stockOferta', 'stock_oferta', 'int', offerLimit(1)),
      field('vigenteHasta', 'vigente_hasta', 'timestamptz', { nullable: true, optional: true, fallback: 'NULL' }),
      field('unidadesRestantes', 'unidades_restantes', 'int', offerLimit(0))
    ],
    fixed: [
      ['razon_ia', "'Promoción aprobada por la tienda.'"],
      ['estado', "'APROBADA'"],
      ['activa', 'TRUE']
    ]
  }
};

// Orden de envío y aplicación: primero lo referenciado, luego lo que lo referencia.
const SECTION_ORDER = ['categorias', 'productos', 'lotes', 'promociones'];

module.exports = { SECTIONS, SECTION_ORDER };
