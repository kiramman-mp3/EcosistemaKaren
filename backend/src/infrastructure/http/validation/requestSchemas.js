const { z } = require('zod');

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
    q: z.string().trim().max(120).optional(),
    categoriaId: entityId.optional(),
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
    loteId: z.string().uuid('El filtro loteId debe ser un UUID válido.').optional(),
    tipo: z.enum(['INGRESO', 'TRASLADO', 'MERMA', 'RESERVA', 'LIBERACION', 'VENTA', 'VENCIMIENTO', 'AJUSTE']).optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100)
  }),
  wasteQuery: z.strictObject({
    loteId: z.string().uuid('El filtro loteId debe ser un UUID válido.').optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100)
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
  emptyBody
};

module.exports = schemas;
