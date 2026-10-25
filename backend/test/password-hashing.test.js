const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { RegisterUser, LoginUser, bcryptRounds } = require('../src/use-cases/auth/AuthUseCases');
const { UnauthorizedException } = require('../src/domain/exceptions/DomainExceptions');

const SECRET = 'un-secreto-de-pruebas-de-al-menos-32-caracteres';

function memoryUsers(initial = []) {
  const users = [...initial];
  return {
    users,
    findByEmail: async (email) => users.find(user => user.email === email) || null,
    save: async (user) => { const saved = { ...user, id: `u${users.length + 1}` }; users.push(saved); return saved; },
    updatePasswordHash: async (id, hash) => { users.find(user => user.id === id).passwordHash = hash; }
  };
}

test('el costo de bcrypt se configura con BCRYPT_ROUNDS entre 10 y 14 y por defecto es 12', () => {
  assert.equal(bcryptRounds({}), 12);
  assert.equal(bcryptRounds({ BCRYPT_ROUNDS: '11' }), 11);
  assert.equal(bcryptRounds({ BCRYPT_ROUNDS: '4' }), 10, 'nunca por debajo de 10');
  assert.equal(bcryptRounds({ BCRYPT_ROUNDS: '20' }), 14, 'nunca por encima de 14');
  assert.equal(bcryptRounds({ BCRYPT_ROUNDS: 'abc' }), 12);
});

test('el registro cifra la contraseña con el costo configurado', async () => {
  const repo = memoryUsers();
  await new RegisterUser(repo, SECRET, { rounds: 10 }).execute({ nombre: 'Ana', email: 'ana@x.test', password: 'ClaveSegura123' });
  assert.equal(bcrypt.getRounds(repo.users[0].passwordHash), 10);
  assert.equal(await bcrypt.compare('ClaveSegura123', repo.users[0].passwordHash), true);
});

test('al iniciar sesión, una cuenta con costo menor se actualiza al costo actual', async () => {
  const oldHash = await bcrypt.hash('ClaveSegura123', 10);
  const repo = memoryUsers([{ id: 'u1', nombre: 'Ana', email: 'ana@x.test', rol: 'CLIENTE', passwordHash: oldHash }]);
  const login = new LoginUser(repo, SECRET, { rounds: 11 });

  const result = await login.execute({ email: 'ana@x.test', password: 'ClaveSegura123' });
  assert.ok(result.token);
  assert.equal(bcrypt.getRounds(repo.users[0].passwordHash), 11, 'el hash se regeneró con el costo nuevo');
  assert.equal(await bcrypt.compare('ClaveSegura123', repo.users[0].passwordHash), true, 'la contraseña sigue siendo la misma');

  const again = await login.execute({ email: 'ana@x.test', password: 'ClaveSegura123' });
  assert.ok(again.token);
});

test('una contraseña incorrecta no actualiza el hash', async () => {
  const oldHash = await bcrypt.hash('ClaveSegura123', 10);
  const repo = memoryUsers([{ id: 'u1', nombre: 'Ana', email: 'ana@x.test', rol: 'CLIENTE', passwordHash: oldHash }]);
  await assert.rejects(() => new LoginUser(repo, SECRET, { rounds: 11 }).execute({ email: 'ana@x.test', password: 'incorrecta' }), UnauthorizedException);
  assert.equal(repo.users[0].passwordHash, oldHash);
});

test('si no se puede guardar el hash nuevo el inicio de sesión sigue funcionando', async () => {
  const oldHash = await bcrypt.hash('ClaveSegura123', 10);
  const repo = memoryUsers([{ id: 'u1', nombre: 'Ana', email: 'ana@x.test', rol: 'CLIENTE', passwordHash: oldHash }]);
  repo.updatePasswordHash = async () => { throw new Error('base caída'); };
  const result = await new LoginUser(repo, SECRET, { rounds: 11 }).execute({ email: 'ana@x.test', password: 'ClaveSegura123' });
  assert.ok(result.token);
});

test('un correo inexistente y uno existente con contraseña incorrecta devuelven el mismo error y comparan con el mismo costo', async () => {
  const hash = await bcrypt.hash('ClaveSegura123', 11);
  const repo = memoryUsers([{ id: 'u1', nombre: 'Ana', email: 'ana@x.test', rol: 'CLIENTE', passwordHash: hash }]);
  const login = new LoginUser(repo, SECRET, { rounds: 11 });

  const missing = await login.execute({ email: 'nadie@x.test', password: 'x' }).catch(error => error);
  const wrong = await login.execute({ email: 'ana@x.test', password: 'x' }).catch(error => error);
  assert.ok(missing instanceof UnauthorizedException && wrong instanceof UnauthorizedException);
  assert.equal(missing.message, wrong.message);
  assert.equal(bcrypt.getRounds(await login._dummyPasswordHash()), 11, 'el hash de relleno usa el costo configurado');
});
