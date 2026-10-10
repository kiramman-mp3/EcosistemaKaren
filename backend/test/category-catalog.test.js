const test = require('node:test');
const assert = require('node:assert/strict');
const InMemoryRepositories = require('../src/adapters/repositories/InMemoryRepositories');
const { CreateCategory } = require('../src/use-cases/categories/CategoryUseCases');

test('crea categorías del catálogo y rechaza nombres duplicados sin distinguir mayúsculas', async () => {
  const memory = new InMemoryRepositories();
  const createCategory = new CreateCategory(memory.categoryRepository);

  const created = await createCategory.execute({
    nombre: 'Limpieza del hogar',
    descripcion: 'Productos de aseo y limpieza'
  });
  assert.equal(created.nombre, 'Limpieza del hogar');

  await assert.rejects(
    () => createCategory.execute({ nombre: 'limpieza DEL HOGAR' }),
    /Ya existe una categoría/
  );
});
