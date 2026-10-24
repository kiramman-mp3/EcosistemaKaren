const { z } = require('zod');
const { SECTIONS } = require('../../sync/catalogSections');

const text = (min, max, label) => z.string()
  .trim()
  .min(min, `${label} debe tener al menos ${min} caracteres.`)
  .max(max, `${label} no puede superar ${max} caracteres.`);

const entityId = z.string()
  .trim()
  .min(1, 'El identificador es obligatorio.')
  .max(64, 'El identificador es demasiado largo.')
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'El identificador no tiene un formato válido.');

const barcode = z.string()
  .trim()
  .min(4, 'El código de barras debe tener al menos 4 caracteres.')
  .max(64, 'El código de barras no puede superar 64 caracteres.')
  .regex(/^[A-Za-z0-9.-]+$/, 'El código de barras contiene caracteres no válidos.');

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe usar el formato AAAA-MM-DD.')
  .refine(value => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'La fecha no existe en el calendario.');

const positiveInteger = (max = 10_000_000) => z.coerce.number().int().min(1).max(max);
const money = z.coerce.number().finite().positive().max(1_000_000);
const location = z.enum(['BODEGA', 'PERCHA']);
const emptyBody = z.strictObject({});
const idParams = z.strictObject({ id: entityId });

const emptyToUndefined = (schema) => z.preprocess(val => (val === '' ? undefined : val), schema);

const MAX_SYNC_ITEMS = 50000;

// Igual que el tipo UUID de PostgreSQL: cualquier 8-4-4-4-12 hexadecimal. z.uuid() exige además
// versión y variante RFC 4122, y rechazaría ids válidos de la base (p. ej. los de los datos semilla).
const postgresUuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'El identificador no es un UUID válido.');

// Valida cada sección del snapshot de catálogo con las mismas definiciones que usa el
// repositorio espejo, de modo que el contrato vive en un solo lugar.
function catalogItemSchema(spec) {
  const shape = {};
  for (const { key, sql, max, min, nullable } of spec.fields) {
    let schema;
    if (sql === 'uuid') schema = postgresUuid;
    else if (sql === 'text') schema = z.string().min(nullable ? 0 : 1).max(max);
    else if (sql === 'int') schema = z.number().int().min(min).max(max);
    else if (sql === 'numeric') schema = z.number().finite().min(min).max(max);
    else if (sql === 'date') schema = isoDate;
    else if (sql === 'timestamptz') schema = z.iso.datetime({ offset: true });
    else throw new Error(`Tipo de sincronización no soportado: ${sql}`);
    shape[key] = nullable ? schema.nullable() : schema;
  }
  return z.strictObject(shape);
}

function catalogSyncBody() {
  const sections = Object.entries(SECTIONS).map(([section, spec]) => z.strictObject({
    section: z.literal(section),
    version: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    items: z.array(catalogItemSchema(spec)).max(MAX_SYNC_ITEMS)
  }));
  return z.discriminatedUnion('section', sections);
}

const schemas = {
  categoryBody: z.strictObject({
    nombre: text(2, 100, 'El nombre'),
    descripcion: text(1, 500, 'La descripción').nullable().optional()
  }),
  productBody: z.strictObject({
    categoriaId: entityId,
    codigoBarras: barcode,
    nombre: text(3, 200, 'El nombre'),
    descripcion: text(1, 1000, 'La descripción').nullable().optional(),
    precioVenta: money,
    impuestoPorcentaje: z.coerce.number().finite().min(0).max(100).optional(),
    minStockAlerta: z.coerce.number().int().min(0).max(10_000_000).optional()
  }),
  productQuery: z.strictObject({
    q: emptyToUndefined(z.string().trim().max(120).optional()),
    categoriaId: emptyToUndefined(entityId.optional()),
    limit: z.coerce.number().int().min(1).max(100).default(30),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0)
  }),
  barcodeParams: z.strictObject({ barcode }),
  lotBody: z.strictObject({
    productoId: entityId,
    numeroLote: text(1, 100, 'El número de lote').regex(/^[\p{L}\p{N}._/-]+$/u, 'El número de lote contiene caracteres no válidos.'),
    fechaElaboracion: isoDate,
    fechaCaducidad: isoDate,
    costoUnitario: money,
    cantidadIngresada: positiveInteger(),
    ubicacion: location.optional()
  }).superRefine((data, ctx) => {
    if (data.fechaElaboracion >= data.fechaCaducidad) {
      ctx.addIssue({ code: 'custom', path: ['fechaElaboracion'], message: 'La fecha de elaboración debe ser anterior a la fecha de caducidad.' });
    }
  }),
  idParams,
  locationBody: z.strictObject({ ubicacion: location }),
  wasteBody: z.strictObject({
    cantidad: positiveInteger(),
    razon: text(3, 500, 'La razón')
  }),
  movementQuery: z.strictObject({
    loteId: emptyToUndefined(z.string().uuid('El filtro loteId debe ser un UUID válido.').optional()),
    tipo: emptyToUndefined(z.enum(['INGRESO', 'TRASLADO', 'MERMA', 'RESERVA', 'LIBERACION', 'VENTA', 'VENCIMIENTO', 'AJUSTE']).optional()),
    limit: z.coerce.number().int().min(1).max(500).default(100)
  }),
  wasteQuery: z.strictObject({
    loteId: emptyToUndefined(z.string().uuid('El filtro loteId debe ser un UUID válido.').optional()),
    limit: z.coerce.number().int().min(1).max(500).default(100)
  }),
  alertQuery: z.strictObject({
    atendida: emptyToUndefined(z.enum(['true', 'false']).transform(val => val === 'true').optional()),
    nivel: emptyToUndefined(z.enum(['AMARILLO', 'ROJO', 'VENCIDO']).optional()),
    loteId: emptyToUndefined(z.string().uuid('El filtro loteId debe ser un UUID válido.').optional()),
    limit: z.coerce.number().int().min(1).max(500).default(100),
    offset: z.coerce.number().int().min(0).max(100_000).default(0)
  }),
  reservationBody: z.strictObject({
    usuarioId: entityId.optional(),
    items: z.array(z.strictObject({
      productoId: entityId,
      cantidad: positiveInteger(10_000),
      promocionId: entityId.optional()
    })).min(1, 'La reserva debe contener al menos un producto.').max(100, 'Una reserva no puede superar 100 líneas.')
  }).superRefine((data, ctx) => {
    const total = data.items.reduce((sum, item) => sum + item.cantidad, 0);
    if (total > 10_000) ctx.addIssue({ code: 'custom', path: ['items'], message: 'La reserva no puede superar 10000 unidades.' });
  }),
  reservationCodeParams: z.strictObject({
    code: z.string().trim().regex(/^KR-[A-Z0-9]{6,20}$/, 'El código de retiro no tiene un formato válido.')
  }),
  userParams: z.strictObject({ userId: entityId }),
  reservationQuery: z.strictObject({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).max(100_000).default(0)
  }),
  promotionBody: z.strictObject({ loteId: entityId }),
  rejectionBody: z.strictObject({ motivoRechazo: text(3, 500, 'El motivo de rechazo') }),
  promotionAdminQuery: z.strictObject({
    estado: z.enum(['PENDIENTE_APROBACION', 'APROBADA', 'RECHAZADA']).optional(),
    activa: z.enum(['true', 'false']).transform(value => value === 'true').optional()
  }),
  promotionUpdateBody: z.strictObject({
    descuentoPorcentaje: z.coerce.number().finite().min(5).max(50),
    frasePromocional: text(3, 180, 'La frase promocional')
  }),
  registerBody: z.strictObject({
    nombre: text(2, 120, 'El nombre'),
    email: z.string().trim().email('El correo electrónico no es válido.').max(254).transform(value => value.toLowerCase()),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').max(128, 'La contraseña no puede superar 128 caracteres.')
  }),
  loginBody: z.strictObject({
    email: z.string().trim().email('El correo electrónico no es válido.').max(254).transform(value => value.toLowerCase()),
    password: z.string().min(1, 'La contraseña es obligatoria.').max(128, 'La contraseña no puede superar 128 caracteres.')
  }),
  // Latido que store-api envía al portal; todos los campos son informativos.
  storeHeartbeatBody: z.strictObject({
    storeId: z.string().trim().min(1).max(64).optional(),
    version: z.string().trim().min(1).max(32).optional(),
    pendingEvents: z.number().int().min(0).max(1000000).optional()
  }),
  catalogSyncBody: catalogSyncBody(),
  emptyBody
};

module.exports = schemas;
