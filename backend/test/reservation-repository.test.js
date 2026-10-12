const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('dotenv').config();

const Lot = require('../src/domain/entities/Lot');
const Reservation = require('../src/domain/entities/Reservation');
const { getPool } = require('../src/infrastructure/db/postgres');
const { PostgresLotRepository, PostgresReservationRepository } = require('../src/adapters/repositories/PostgresRepositories');

test.after(() => getPool().end());

async function setup(t) {
  const pool = getPool();
  try {
    await pool.query('SELECT 1');
  } catch {
    t.skip('PostgreSQL no disponible para prueba de integración');
    return null;
  }
  const category = await pool.query('SELECT id FROM categorias ORDER BY id LIMIT 1');
  const actor = await pool.query("SELECT id FROM usuarios WHERE rol = 'BODEGUERO' ORDER BY id LIMIT 1");
  const customer = await pool.query("SELECT id, nombre FROM usuarios WHERE rol = 'CLIENTE' ORDER BY id LIMIT 1");
  if (!category.rowCount || !actor.rowCount || !customer.rowCount) {
    t.skip('Faltan semillas de categoría, bodeguero o cliente');
    return null;
  }

  const productId = randomUUID();
  const productName = `Producto reserva ${Date.now()}`;
  await pool.query(`
    INSERT INTO productos (id, categoria_id, codigo_barras, nombre, precio_venta, min_stock_alerta, imagen_url)
    VALUES ($1, $2, $3, $4, 1.50, 1, '/api/v1/media/productos/test.jpg')
  `, [productId, category.rows[0].id, `RES-${Date.now()}`, productName]);

  const lotRepo = new PostgresLotRepository(pool);
  const lot = await lotRepo.save(new Lot({
    productoId: productId,
    numeroLote: `PG-RES-${Date.now()}`,
    fechaElaboracion: '2026-01-01',
    fechaCaducidad: '2099-01-01',
    costoUnitario: 0.9,
    cantidadIngresada: 10,
    ubicacion: 'PERCHA',
  }), actor.rows[0].id);

  const reservationIds = [];
  t.after(async () => {
    await pool.query('DELETE FROM inventario_movimientos WHERE lote_id = $1', [lot.id]);
    if (reservationIds.length) await pool.query('DELETE FROM reservas WHERE id = ANY($1::uuid[])', [reservationIds]);
    await pool.query('DELETE FROM lotes WHERE id = $1', [lot.id]);
    await pool.query('DELETE FROM productos WHERE id = $1', [productId]);
  });

  return {
    pool, lot, productId, productName, reservationIds,
    customer: { id: customer.rows[0].id, nombre: customer.rows[0].nombre, rol: 'CLIENTE' },
    repo: new PostgresReservationRepository(pool),
    lotRepo,
  };
}

test('PostgreSQL cancela una reserva vigente, libera el stock y registra la liberación', async t => {
  const ctx = await setup(t);
  if (!ctx) return;
  const reservation = await ctx.repo.createWithLockedStock(new Reservation({
    usuarioId: ctx.customer.id,
    fechaExpiracion: new Date(Date.now() + 10 * 60 * 1000),
  }), [{ productoId: ctx.productId, cantidad: 3 }]);
  ctx.reservationIds.push(reservation.id);

  const cancelled = await ctx.repo.cancelWithLockedStock(reservation.id, ctx.customer);
  assert.equal(cancelled.estado, 'CANCELADA');

  const lot = await ctx.lotRepo.findById(ctx.lot.id);
  assert.equal(lot.cantidadDisponible, 10);
  assert.equal(lot.cantidadReservada, 0);

  const movements = await ctx.lotRepo.findMovements({ loteId: ctx.lot.id });
  assert.equal(movements[0].tipo, 'LIBERACION');
  assert.equal(movements[0].reservaId, reservation.id);
});

test('PostgreSQL devuelve el detalle de reserva con nombre de producto y cliente', async t => {
  const ctx = await setup(t);
  if (!ctx) return;
  const reservation = await ctx.repo.createWithLockedStock(new Reservation({
    usuarioId: ctx.customer.id,
    fechaExpiracion: new Date(Date.now() + 10 * 60 * 1000),
  }), [{ productoId: ctx.productId, cantidad: 2 }]);
  ctx.reservationIds.push(reservation.id);

  const byCode = await ctx.repo.findByCode(reservation.codigoRetiro);
  assert.equal(byCode.clienteNombre, ctx.customer.nombre);
  assert.equal(byCode.detalles.length, 1);
  assert.equal(byCode.detalles[0].productoNombre, ctx.productName);
  assert.equal(byCode.detalles[0].imagenUrl, '/api/v1/media/productos/test.jpg');
  assert.equal(byCode.detalles[0].numeroLote, ctx.lot.numeroLote);

  const byUser = await ctx.repo.findByUserId(ctx.customer.id, { limit: 50, offset: 0 });
  const listed = byUser.find(item => item.id === reservation.id);
  assert.ok(listed, 'la reserva debe aparecer en el historial del cliente');
  assert.equal(listed.detalles[0].productoNombre, ctx.productName);
});

test('PostgreSQL expira reservas vencidas y registra cada liberación con su reserva', async t => {
  const ctx = await setup(t);
  if (!ctx) return;
  const reservation = await ctx.repo.createWithLockedStock(new Reservation({
    usuarioId: ctx.customer.id,
    fechaExpiracion: new Date(Date.now() - 1000),
  }), [{ productoId: ctx.productId, cantidad: 4 }]);
  ctx.reservationIds.push(reservation.id);

  const result = await ctx.repo.expirePendingWithLockedStock();
  assert.ok(result.countLiberadas >= 1);

  const expired = await ctx.repo.findById(reservation.id);
  assert.equal(expired.estado, 'EXPIRADA');
  const lot = await ctx.lotRepo.findById(ctx.lot.id);
  assert.equal(lot.cantidadDisponible, 10);
  assert.equal(lot.cantidadReservada, 0);
  const [release] = await ctx.lotRepo.findMovements({ loteId: ctx.lot.id });
  assert.equal(release.tipo, 'LIBERACION');
  assert.equal(release.reservaId, reservation.id);
  assert.equal(release.disponibleAntes, 6);
  assert.equal(release.disponibleDespues, 10);
});
