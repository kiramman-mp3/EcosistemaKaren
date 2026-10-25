const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('dotenv').config();

const Lot = require('../src/domain/entities/Lot');
const InMemoryRepositories = require('../src/adapters/repositories/InMemoryRepositories');
const { getPool } = require('../src/infrastructure/db/postgres');
const { PostgresLotRepository } = require('../src/adapters/repositories/PostgresRepositories');
const schemas = require('../src/infrastructure/http/validation/requestSchemas');
const { IngresarLote, RegisterMerma, GetInventorySummary, summaryPeriodStart } = require('../src/use-cases/lots/LotUseCases');

const staff = { id: 'd8a7b6c5-1111-2222-3333-444455556667', rol: 'BODEGUERO' };

test('cada período empieza a la medianoche e incluye el día en curso', () => {
  const now = new Date(2026, 9, 25, 15, 40);
  assert.deepEqual(summaryPeriodStart('hoy', now), new Date(2026, 9, 25));
  assert.deepEqual(summaryPeriodStart('7d', now), new Date(2026, 9, 19));
  assert.deepEqual(summaryPeriodStart('30d', now), new Date(2026, 8, 26));
  assert.throws(() => summaryPeriodStart('1y', now), /hoy, 7d o 30d/);
});

test('la ruta solo acepta los tres períodos y usa 7 días por defecto', () => {
  assert.equal(schemas.summaryQuery.parse({}).periodo, '7d');
  assert.equal(schemas.summaryQuery.parse({ periodo: 'hoy' }).periodo, 'hoy');
  assert.equal(schemas.summaryQuery.safeParse({ periodo: '1y' }).success, false);
  assert.equal(schemas.summaryQuery.safeParse({ periodo: '7d', extra: 1 }).success, false);
});

test('el resumen suma solo lo ocurrido dentro del período', async () => {
  const memory = new InMemoryRepositories();
  const product = memory.products[0];
  const lot = await new IngresarLote(memory.lotRepository, memory.productRepository, null, null).execute({
    productoId: product.id, numeroLote: `SUM-${Date.now()}`, fechaElaboracion: '2026-10-01',
    fechaCaducidad: '2027-10-01', costoUnitario: 0.5, cantidadIngresada: 40, ubicacion: 'BODEGA',
  }, staff);
  await new RegisterMerma(memory.lotRepository).execute(lot.id, 4, 'Envase dañado en percha', staff);

  // Una venta y una merma de hace 10 días: entran en 30 días, no en 7 ni en hoy.
  const old = new Date(Date.now() - 10 * 86400000);
  memory.movements.push({ id: randomUUID(), loteId: lot.id, tipo: 'VENTA', cantidad: 6, created_at: old });
  memory.wastes.push({ id: randomUUID(), loteId: lot.id, cantidad: 2, costoTotal: 1, created_at: old });

  const summary = new GetInventorySummary(memory.lotRepository);
  const today = await summary.execute({ periodo: 'hoy' }, staff);
  assert.equal(today.periodo, 'hoy');
  assert.deepEqual(
    { ingresos: today.ingresos, ventas: today.ventas, mermas: today.mermas, costoMerma: today.costoMerma },
    { ingresos: 40, ventas: 0, mermas: 4, costoMerma: 2 },
  );
  assert.ok(new Date(today.desde) <= new Date(today.hasta));

  const month = await summary.execute({ periodo: '30d' }, staff);
  assert.deepEqual(
    { ingresos: month.ingresos, ventas: month.ventas, mermas: month.mermas, costoMerma: month.costoMerma },
    { ingresos: 40, ventas: 6, mermas: 6, costoMerma: 3 },
  );
});

test('el resumen exige un rol de bodega o administración', async () => {
  const memory = new InMemoryRepositories();
  const summary = new GetInventorySummary(memory.lotRepository);
  await assert.rejects(() => summary.execute({ periodo: '7d' }, { id: 'c1', rol: 'CLIENTE' }), /autorización/);
  await assert.rejects(() => summary.execute({ periodo: '7d' }, null), /autorización/);
});

test('PostgreSQL resume ingresos, ventas y mermas del rango pedido', async t => {
  const pool = getPool();
  try {
    await pool.query('SELECT 1');
  } catch {
    t.skip('PostgreSQL no disponible para prueba de integración');
    return;
  }
  const category = await pool.query('SELECT id FROM categorias ORDER BY id LIMIT 1');
  const actor = await pool.query("SELECT id FROM usuarios WHERE email = 'bodega@karen.com'");
  if (!category.rowCount || !actor.rowCount) {
    t.skip('Faltan semillas de producto o bodeguero');
    await pool.end();
    return;
  }

  const repo = new PostgresLotRepository(pool);
  const productId = randomUUID();
  await pool.query(`
    INSERT INTO productos (id, categoria_id, codigo_barras, nombre, precio_venta, min_stock_alerta)
    VALUES ($1, $2, $3, 'Producto resumen de inventario', 2.50, 1)
  `, [productId, category.rows[0].id, `SUM-${Date.now()}`]);
  let lotId;
  t.after(async () => {
    if (lotId) {
      await pool.query('DELETE FROM mermas WHERE lote_id = $1', [lotId]);
      await pool.query('DELETE FROM inventario_movimientos WHERE lote_id = $1', [lotId]);
      await pool.query('DELETE FROM lotes WHERE id = $1', [lotId]);
    }
    await pool.query('DELETE FROM productos WHERE id = $1', [productId]);
    await pool.end();
  });

  const lot = await repo.save(new Lot({
    productoId: productId, numeroLote: `PG-SUM-${Date.now()}`, fechaElaboracion: '2026-10-01',
    fechaCaducidad: '2027-10-01', costoUnitario: 1.25, cantidadIngresada: 12, ubicacion: 'BODEGA',
  }), actor.rows[0].id);
  lotId = lot.id;
  await repo.registerWasteWithAudit(lot.id, 2, 'Producto dañado en recepción', actor.rows[0].id);

  // Se mueve todo a una semana de 2001 para que otras pruebas que escriben a la vez no cambien el total.
  await pool.query("UPDATE inventario_movimientos SET created_at = '2001-03-05T12:00:00Z' WHERE lote_id = $1", [lot.id]);
  await pool.query("UPDATE mermas SET created_at = '2001-03-05T12:00:00Z' WHERE lote_id = $1", [lot.id]);

  const inside = await repo.summarizeInventory({ desde: new Date('2001-03-01T00:00:00Z'), hasta: new Date('2001-03-08T00:00:00Z') });
  assert.deepEqual(inside, { ingresos: 12, ventas: 0, mermas: 2, costoMerma: 2.5 });

  const outside = await repo.summarizeInventory({ desde: new Date('2001-03-05T12:00:00.001Z'), hasta: new Date('2001-03-08T00:00:00Z') });
  assert.deepEqual(outside, { ingresos: 0, ventas: 0, mermas: 0, costoMerma: 0 });
});
