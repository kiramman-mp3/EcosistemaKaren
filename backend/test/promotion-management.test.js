const test = require('node:test');
const assert = require('node:assert/strict');
const InMemoryRepositories = require('../src/adapters/repositories/InMemoryRepositories');
const { ManagePromotions } = require('../src/use-cases/promotions/PromotionUseCases');

const admin = { id: 'admin-test', rol: 'ADMIN' };

test('ADMIN edita y elimina únicamente borradores de promoción', async () => {
  const memory = new InMemoryRepositories();
  const repository = memory.promotionRepository;
  const manager = new ManagePromotions(repository);
  const lot = memory.lots[0];
  const draft = await repository.savePending({
    loteId: lot.id, descuentoPorcentaje: 15, frasePromocional: 'Frase original',
    razonIa: 'Justificación técnica válida', modeloIa: 'test', promptVersion: 'v1',
    cacheKey: 'management-test', cacheHit: false
  });

  const updated = await manager.update({ promotionId: draft.id, descuentoPorcentaje: 20, frasePromocional: 'Frase editada' }, admin);
  assert.equal(updated.descuentoPorcentaje, 20);
  assert.equal(updated.frasePromocional, 'Frase editada');
  assert.equal(await manager.deleteDraft(draft.id, admin), true);
  assert.equal(await repository.findById(draft.id), null);
});

test('finalizar una promoción aprobada la retira del catálogo público', async () => {
  const memory = new InMemoryRepositories();
  const repository = memory.promotionRepository;
  const manager = new ManagePromotions(repository);
  const active = memory.promotions.find(item => item.estado === 'APROBADA' && item.activa);
  assert.ok(active);

  await manager.deactivate(active.id, admin);
  assert.equal(active.activa, false);
  assert.equal((await repository.findAllApproved()).some(item => item.id === active.id), false);
});
