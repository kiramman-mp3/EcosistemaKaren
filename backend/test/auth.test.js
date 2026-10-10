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

test('authenticate acepta la sesión web desde una cookie HttpOnly ya verificada por JWT', async () => {
  const { authenticate } = createAuthMiddleware(SECRET);
  const token = jwt.sign(
    { id: 'web-1', nombre: 'Cliente Web', email: 'web@example.com', rol: 'CLIENTE' },
    SECRET,
    { algorithm: 'HS256', expiresIn: '5m' }
  );
  const req = { get: () => undefined, cookies: { karen_session: token } };
  assert.equal(await executeMiddleware(authenticate, req), undefined);
  assert.equal(req.user.id, 'web-1');
  assert.equal(req.user.nombre, 'Cliente Web');
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

test('las cuentas seed aceptan demo123 y rechazan contraseñas incorrectas', async () => {
  const memory = new InMemoryRepositories();
  const useCase = new LoginUser(memory.userRepository, SECRET);
  const bodega = await useCase.execute({ email: 'bodega@karen.com', password: 'demo123' });
  const admin = await useCase.execute({ email: 'admin@karen.com', password: 'demo123' });
  assert.equal(bodega.user.rol, 'BODEGUERO');
  assert.equal(admin.user.rol, 'ADMIN');
  await assert.rejects(
    () => useCase.execute({ email: 'cliente@karen.com', password: 'incorrecta' }),
    error => error.statusCode === 401
  );
});
