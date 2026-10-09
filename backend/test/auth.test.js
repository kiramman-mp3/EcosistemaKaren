const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const createAuthMiddleware = require('../src/infrastructure/http/middlewares/auth');
const { RegisterUser, LoginUser } = require('../src/use-cases/auth/AuthUseCases');
const InMemoryRepositories = require('../src/adapters/repositories/InMemoryRepositories');

const SECRET = 'test-secret-with-at-least-32-characters';

function executeMiddleware(middleware, req) {
  return new Promise(resolve => middleware(req, {}, error => resolve(error)));
}

test('authenticate rechaza peticiones sin Bearer token', async () => {
  const { authenticate } = createAuthMiddleware(SECRET);
  const error = await executeMiddleware(authenticate, { get: () => undefined });
  assert.equal(error.statusCode, 401);
});

test('authenticate verifica el token y authorize aplica el rol', async () => {
  const { authenticate, authorize } = createAuthMiddleware(SECRET);
  const token = jwt.sign(
    { id: 'user-1', email: 'cliente@example.com', rol: 'CLIENTE' },
    SECRET,
    { algorithm: 'HS256', expiresIn: '5m' }
  );
  const req = { get: () => `Bearer ${token}` };
  assert.equal(await executeMiddleware(authenticate, req), undefined);
  assert.equal(req.user.id, 'user-1');
  assert.equal((await executeMiddleware(authorize('ADMIN'), req)).statusCode, 403);
  assert.equal(await executeMiddleware(authorize('CLIENTE'), req), undefined);
});

test('el registro público ignora roles inyectados y crea únicamente CLIENTE', async () => {
  const memory = new InMemoryRepositories();
  const useCase = new RegisterUser(memory.userRepository, SECRET);
  const result = await useCase.execute({
    nombre: 'Nuevo Cliente',
    email: 'nuevo@example.com',
    password: 'clave-segura',
    rol: 'ADMIN'
  });
  assert.equal(result.user.rol, 'CLIENTE');
});

test('login no acepta una contraseña maestra de demostración', async () => {
  const memory = new InMemoryRepositories();
  const useCase = new LoginUser(memory.userRepository, SECRET);
  await assert.rejects(
    () => useCase.execute({ email: 'cliente@karen.com', password: 'incorrecta' }),
    error => error.statusCode === 401
  );
});
