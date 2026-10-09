const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('dotenv').config();

const Lot = require('../src/domain/entities/Lot');
const Reservation = require('../src/domain/entities/Reservation');
const InMemoryRepositories = require('../src/adapters/repositories/InMemoryRepositories');
const { getPool } = require('../src/infrastructure/db/postgres');
const { PostgresLotRepository, PostgresReservationRepository } = require('../src/adapters/repositories/PostgresRepositories');
const {
  IngresarLote,
  UpdateLotLocation,
  RegisterMerma,
  GetInventoryMovements,
  GetWastes,
} = require('../src/use-cases/lots/LotUseCases');

const staff = { id: 'd8a7b6c5-1111-2222-3333-444455556667', rol: 'BODEGUERO' };

test('el lote valida costo y orden cronológico de elaboración/caducidad', () => {
  assert.throws(() => new Lot({
    productoId: 'p1', numeroLote: 'L1', fechaElaboracion: '2026-10-10',
    fechaCaducidad: '2026-10-09', costoUnitario: 1, cantidadIngresada: 1,
  }), /elaboración debe ser anterior/);
  assert.throws(() => new Lot({
    productoId: 'p1', numeroLote: 'L1', fechaElaboracion: '2026-10-01',
    fechaCaducidad: '2026-10-09', costoUnitario: 0, cantidadIngresada: 1,
  }), /costo unitario/);
});

test('ingreso, traslado y merma generan trazabilidad con actor y costo', async () => {
  const memory = new InMemoryRepositories();
  const product = memory.products[0];
  const ingreso = new IngresarLote(memory.lotRepository, memory.productRepository, null, null);
  const traslado = new UpdateLotLocation(memory.lotRepository);
  const merma = new RegisterMerma(memory.lotRepository);
  const getMovements = new GetInventoryMovements(memory.lotRepository);
  const getWastes = new GetWastes(memory.lotRepository);

  const lot = await ingreso.execute({
    productoId: product.id,
    numeroLote: `AUD-${Date.now()}`,
    fechaElaboracion: '2026-10-01',
    fechaCaducidad: '2027-10-01',
    costoUnitario: 0.65,
    cantidadIngresada: 20,
    ubicacion: 'BODEGA',
  }, staff);

  await traslado.execute(lot.id, 'PERCHA', staff);
  const result = await merma.execute(lot.id, 3, 'Envase dañado durante manipulación', staff);

  assert.equal(result.lote.cantidadDisponible, 17);
  assert.equal(result.merma.costoTotal, 1.95);
  assert.equal(result.merma.registradaPor, staff.id);

  const movements = await getMovements.execute({ loteId: lot.id }, staff);
  assert.deepEqual(movements.map(item => item.tipo), ['MERMA', 'TRASLADO', 'INGRESO']);
  assert.equal(movements[0].disponibleAntes, 20);
  assert.equal(movements[0].disponibleDespues, 17);
  assert.equal(movements[0].actorId, staff.id);

  const wastes = await getWastes.execute({ loteId: lot.id }, staff);
  assert.equal(wastes.length, 1);
  assert.equal(wastes[0].movimientoId, movements[0].id);
});

test('los casos de uso rechazan movimientos no autorizados', async () => {
  const memory = new InMemoryRepositories();
  const lot = memory.lots[1];
  const client = { id: 'client-1', rol: 'CLIENTE' };

  await assert.rejects(
    () => new UpdateLotLocation(memory.lotRepository).execute(lot.id, 'PERCHA', client),
    error => error.statusCode === 403,
  );
  await assert.rejects(
    () => new RegisterMerma(memory.lotRepository).execute(lot.id, 1, 'Daño comprobado', client),
    error => error.statusCode === 403,
  );
});

test('PostgreSQL registra merma y movimiento en la misma transacción', async t => {
  const pool = getPool();
  try {
    await pool.query('SELECT 1');
  } catch {
    t.skip('PostgreSQL no disponible para prueba de integración');
    return;
  }

  const category = await pool.query('SELECT id FROM categorias ORDER BY id LIMIT 1');
  const actor = await pool.query("SELECT id FROM usuarios WHERE rol = 'BODEGUERO' ORDER BY id LIMIT 1");
  if (!category.rowCount || !actor.rowCount) {
    t.skip('Faltan semillas de producto o bodeguero');
    await pool.end();
    return;
  }

  const repo = new PostgresLotRepository(pool);
  const productId = randomUUID();
  await pool.query(`
    INSERT INTO productos (id, categoria_id, codigo_barras, nombre, precio_venta, min_stock_alerta)
    VALUES ($1, $2, $3, 'Producto auditoría inventario', 2.50, 1)
  `, [productId, category.rows[0].id, `AUD-${Date.now()}`]);
  let lotId;
  let reservationId;
  t.after(async () => {
    if (lotId) {
      await pool.query('DELETE FROM mermas WHERE lote_id = $1', [lotId]);
      await pool.query('DELETE FROM inventario_movimientos WHERE lote_id = $1', [lotId]);
      if (reservationId) await pool.query('DELETE FROM reservas WHERE id = $1', [reservationId]);
      await pool.query('DELETE FROM lotes WHERE id = $1', [lotId]);
    }
    await pool.query('DELETE FROM productos WHERE id = $1', [productId]);
    await pool.end();
  });

  const lot = await repo.save(new Lot({
    productoId: productId,
    numeroLote: `PG-AUD-${Date.now()}`,
    fechaElaboracion: '2026-10-01',
    fechaCaducidad: '2027-10-01',
    costoUnitario: 1.25,
    cantidadIngresada: 10,
    ubicacion: 'BODEGA',
  }), actor.rows[0].id);
  lotId = lot.id;

  await repo.changeLocationWithAudit(lot.id, 'PERCHA', actor.rows[0].id);

  const result = await repo.registerWasteWithAudit(
    lot.id, 2, 'Producto dañado en recepción', actor.rows[0].id,
  );
  assert.equal(result.lote.cantidadDisponible, 8);

  const movements = await repo.findMovements({ loteId: lot.id });
  const wastes = await repo.findWastes({ loteId: lot.id });
  assert.deepEqual(movements.map(item => item.tipo), ['MERMA', 'TRASLADO', 'INGRESO']);
  assert.equal(wastes.length, 1);
  assert.equal(Number(wastes[0].costoTotal), 2.5);
  assert.equal(wastes[0].movimientoId, movements[0].id);

  const reservationRepo = new PostgresReservationRepository(pool);
  const customer = await pool.query("SELECT id FROM usuarios WHERE rol = 'CLIENTE' ORDER BY id LIMIT 1");
  const reservation = await reservationRepo.createWithLockedStock(new Reservation({
    usuarioId: customer.rows[0].id,
    fechaExpiracion: new Date(Date.now() + 10 * 60 * 1000),
  }), [{ productoId: productId, cantidad: 1 }]);
  reservationId = reservation.id;
  await reservationRepo.confirmWithLockedStock(reservation.id, { id: actor.rows[0].id, rol: 'BODEGUERO' });

  const afterSale = await repo.findMovements({ loteId: lot.id });
  assert.deepEqual(afterSale.slice(0, 2).map(item => item.tipo), ['VENTA', 'RESERVA']);
  assert.equal(afterSale[0].reservaId, reservation.id);
});
