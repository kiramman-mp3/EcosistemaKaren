const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const createAuthMiddleware = require('../src/infrastructure/http/middlewares/auth');
const AuthController = require('../src/adapters/controllers/AuthController');
const { RegisterUser, LoginUser } = require('../src/use-cases/auth/AuthUseCases');
const InMemoryRepositories = require('../src/adapters/repositories/InMemoryRepositories');

const SECRET = 'test-secret-with-at-least-32-characters';

function executeMiddleware(middleware, req) {
  return new Promise(resolve => middleware(req, {}, error => resolve(error)));
}

test('cerrar sesión revoca el token y authenticate rechaza tokens revocados', async () => {
  const memory = new InMemoryRepositories();
  const blacklistRepo = memory.tokenBlacklistRepository;
  const loginUC = new LoginUser(memory.userRepository, SECRET);
  const registerUC = new RegisterUser(memory.userRepository, SECRET);
  const authController = new AuthController(registerUC, loginUC, blacklistRepo, SECRET);
  const { authenticate } = createAuthMiddleware(SECRET, blacklistRepo);

  // Registro y obtención de token con jti
  const { token } = await registerUC.execute({
    nombre: 'Usuario Prueba',
    email: 'revocation@test.com',
    password: 'password123'
  });

  const payload = jwt.decode(token);
  assert.ok(payload.jti, 'El token debe incluir un identificador único jti');

  // El token es válido antes del logout
  const req = { get: () => `Bearer ${token}` };
  assert.equal(await executeMiddleware(authenticate, req), undefined);
  assert.equal(req.user.email, 'revocation@test.com');

  // Ejecuta logout
  const logoutReq = { get: () => `Bearer ${token}`, cookies: {} };
  let cleared = false;
  let statusCode = null;
  const logoutRes = {
    clearCookie: () => { cleared = true; },
    status: (code) => {
      statusCode = code;
      return { end: () => {} };
    }
  };
  await authController.logout(logoutReq, logoutRes);

  assert.equal(cleared, true);
  assert.equal(statusCode, 204);

  // El token ahora está revocado en el repositorio
  assert.equal(await blacklistRepo.isRevoked(payload.jti), true);

  // authenticate debe rechazar el token revocado con 401
  const reqAfter = { get: () => `Bearer ${token}` };
  const errorAfterLogout = await executeMiddleware(authenticate, reqAfter);
  assert.ok(errorAfterLogout);
  assert.equal(errorAfterLogout.statusCode, 401);
  assert.match(errorAfterLogout.message, /revocado/i);
});
