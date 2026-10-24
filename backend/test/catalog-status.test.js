const test = require('node:test');
const assert = require('node:assert/strict');
const { GetCatalogSyncStatus } = require('../src/use-cases/catalog/CatalogSyncUseCases');
const { SECTION_ORDER } = require('../src/infrastructure/sync/catalogSections');

const NOW = Date.parse('2026-10-24T15:00:00.000Z');
const clock = () => NOW;
const section = (seccion, secondsAgo) => ({
  seccion,
  version: 1,
  elementos: 3,
  sincronizadoAt: new Date(NOW - secondsAgo * 1000).toISOString()
});
const repoWith = (sections) => ({ getSyncStatus: async () => sections });

test('una copia completa y reciente no está desactualizada', async () => {
  const status = await new GetCatalogSyncStatus(
    repoWith(SECTION_ORDER.map((name, i) => section(name, 30 + i))),
    { clock, staleAfterSeconds: 1200 }
  ).execute();
  assert.equal(status.mode, 'mirror');
  assert.equal(status.stale, false);
  assert.equal(status.secondsSinceSync, 33);
  assert.deepEqual(status.missingSections, []);
});

test('sin ninguna sincronización la copia está desactualizada', async () => {
  const status = await new GetCatalogSyncStatus(repoWith([]), { clock }).execute();
  assert.equal(status.stale, true);
  assert.equal(status.lastSyncAt, null);
  assert.deepEqual(status.missingSections, SECTION_ORDER);
});

test('una sección faltante deja la copia desactualizada aunque las demás sean recientes', async () => {
  const status = await new GetCatalogSyncStatus(
    repoWith(SECTION_ORDER.filter(name => name !== 'lotes').map(name => section(name, 10))),
    { clock }
  ).execute();
  assert.equal(status.stale, true);
  assert.deepEqual(status.missingSections, ['lotes']);
});

test('la sección más antigua decide la antigüedad y supera el umbral', async () => {
  const sections = SECTION_ORDER.map(name => section(name, 60));
  sections[2] = section('lotes', 1500);
  const status = await new GetCatalogSyncStatus(repoWith(sections), { clock, staleAfterSeconds: 1200 }).execute();
  assert.equal(status.stale, true);
  assert.equal(status.secondsSinceSync, 1500);
});

test('una sección sin cambios, reenviada hace menos del umbral, no cuenta como vieja', async () => {
  // El reenvío completo es cada 600 s: una sección estable puede tener ~10 min y estar al día.
  const status = await new GetCatalogSyncStatus(
    repoWith(SECTION_ORDER.map(name => section(name, 590))),
    { clock, staleAfterSeconds: 1200 }
  ).execute();
  assert.equal(status.stale, false);
});

test('en el monolito el catálogo se lee de la fuente y nunca está desactualizado', async () => {
  const status = await new GetCatalogSyncStatus(null, { mode: 'direct' }).execute();
  assert.deepEqual(status, { mode: 'direct', stale: false, lastSyncAt: null, staleAfterSeconds: null, sections: [] });
});

test('portal-api sin base de datos informa copia desactualizada en vez de fallar', async () => {
  const status = await new GetCatalogSyncStatus(null, { mode: 'mirror', clock }).execute();
  assert.equal(status.stale, true);
});
