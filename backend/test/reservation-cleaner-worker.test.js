const test = require('node:test');
const assert = require('node:assert/strict');
const ReservationCleanerWorker = require('../src/infrastructure/workers/ReservationCleanerWorker');

test('el sweeper procesa lotes consecutivos hasta vaciar las reservas expiradas', async () => {
  const batches = [100, 100, 37];
  let calls = 0;
  const worker = new ReservationCleanerWorker({
    execute: async () => ({ countLiberadas: batches[calls++] ?? 0 }),
  });
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = await worker.sweep();
    assert.equal(result.countLiberadas, 237);
    assert.equal(calls, 3);
  } finally {
    console.log = originalLog;
  }
});

test('el sweeper no se superpone si una ejecución sigue en curso', async () => {
  let release;
  const worker = new ReservationCleanerWorker({
    execute: () => new Promise(resolve => { release = () => resolve({ countLiberadas: 0 }); }),
  });
  const first = worker.sweep();
  assert.deepEqual(await worker.sweep(), { countLiberadas: 0 });
  release();
  await first;
});
