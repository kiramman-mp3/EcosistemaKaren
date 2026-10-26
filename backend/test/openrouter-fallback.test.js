const test = require('node:test');
const assert = require('node:assert/strict');

const OpenRouterAdapter = require('../src/adapters/ai/OpenRouterAdapter');
const FallbackAiAdapter = require('../src/adapters/ai/FallbackAiAdapter');
const GeminiAdapter = require('../src/adapters/ai/GeminiAdapter');
const { GeminiError, GeminiErrorType } = GeminiAdapter;

const PARAMS = {
  loteId: 'lote-1', numeroLote: 'LOT-01', productoNombre: 'Yogurt',
  diasParaVencer: 3, cantidadDisponible: 10, ubicacion: 'PERCHA', nivelAlerta: 'ROJO',
};
const GOOD_JSON = '{"descuentoPorcentaje":30,"frasePromocional":"Yogurt fresco","razonIa":"Vence pronto."}';
const silent = { warn() {} };

function reply(status, body) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body });
}
function completion(content) {
  return reply(200, { choices: [{ message: { content } }] });
}

test('OpenRouter: devuelve la promoción validada y envía el esquema y la clave', async () => {
  let request;
  const adapter = new OpenRouterAdapter('or-key', {
    model: 'm1', fetchImpl: (url, init) => { request = { url, init }; return completion(GOOD_JSON); },
  });

  const result = await adapter.generarEstrategiaPromocional(PARAMS);
  assert.equal(result.descuentoPorcentaje, 30);
  const body = JSON.parse(request.init.body);
  assert.equal(body.model, 'm1');
  assert.equal(body.response_format.json_schema.schema.properties.descuentoPorcentaje.minimum, 20);
  assert.equal(request.init.headers.Authorization, 'Bearer or-key');
});

test('OpenRouter: sin clave lanza CONFIG sin llamar a la red', async () => {
  const adapter = new OpenRouterAdapter('', { fetchImpl: () => assert.fail('no debe llamar a fetch') });
  await assert.rejects(
    () => adapter.generarEstrategiaPromocional(PARAMS),
    err => err.type === GeminiErrorType.CONFIG
  );
});

test('OpenRouter: mapea 429, 401 y errores dentro de un 200', async () => {
  const typeFor = async (res) => {
    const adapter = new OpenRouterAdapter('k', { maxAttempts: 1, fetchImpl: () => res });
    try { await adapter.generarEstrategiaPromocional(PARAMS); } catch (err) { return err.type; }
    return null;
  };
  assert.equal(await typeFor(reply(429, { error: { message: 'limit' } })), GeminiErrorType.RATE_LIMIT);
  assert.equal(await typeFor(reply(401, { error: { message: 'bad key' } })), GeminiErrorType.CONFIG);
  assert.equal(await typeFor(reply(200, { error: { code: 502, message: 'upstream' } })), GeminiErrorType.EXTERNAL);
  assert.equal(await typeFor(completion('```json\n{}\n```')), GeminiErrorType.INVALID_RESPONSE);
});

test('OpenRouter: reintenta un 5xx y usa el modelo de respaldo en el último intento', async () => {
  const models = [];
  const adapter = new OpenRouterAdapter('k', {
    model: 'primario', fallbackModel: 'respaldo', maxAttempts: 2, retryDelayMs: 1,
    fetchImpl: (_url, init) => {
      const { model } = JSON.parse(init.body);
      models.push(model);
      return model === 'respaldo' ? completion(GOOD_JSON) : reply(503, { error: { message: 'busy' } });
    },
  });

  await adapter.generarEstrategiaPromocional(PARAMS);
  assert.deepEqual(models, ['primario', 'respaldo']);
});

test('Fallback: usa el secundario si el primario falla y registra el modelo real', async () => {
  const primary = { modelName: 'gemini', promptVersion: 'v4', generarEstrategiaPromocional: async () => { throw new GeminiError('down', GeminiErrorType.EXTERNAL); } };
  const secondary = { modelName: 'or-model', promptVersion: 'v4', generarEstrategiaPromocional: async () => ({ descuentoPorcentaje: 25 }) };
  const adapter = new FallbackAiAdapter(primary, secondary, { logger: silent });

  assert.equal(adapter.modelName, 'gemini');
  assert.deepEqual(await adapter.generarEstrategiaPromocional(PARAMS), { descuentoPorcentaje: 25, modelo: 'or-model' });
});

test('Fallback: no toca al secundario si el primario responde y relanza el error del primario si ambos fallan', async () => {
  let secondaryCalls = 0;
  const secondary = { modelName: 'or', generarEstrategiaPromocional: async () => { secondaryCalls++; throw new GeminiError('also down', GeminiErrorType.TIMEOUT); } };
  const ok = new FallbackAiAdapter({ modelName: 'g', generarEstrategiaPromocional: async () => ({ descuentoPorcentaje: 20 }) }, secondary, { logger: silent });
  assert.deepEqual(await ok.generarEstrategiaPromocional(PARAMS), { descuentoPorcentaje: 20 });
  assert.equal(secondaryCalls, 0);

  const primaryError = new GeminiError('primary down', GeminiErrorType.RATE_LIMIT);
  const both = new FallbackAiAdapter({ modelName: 'g', generarEstrategiaPromocional: async () => { throw primaryError; } }, secondary, { logger: silent });
  await assert.rejects(() => both.generarEstrategiaPromocional(PARAMS), err => err === primaryError);
  assert.equal(secondaryCalls, 1);
});

test('Fallback: errores que no son del proveedor no activan el respaldo', async () => {
  let secondaryCalls = 0;
  const bug = new TypeError('bug');
  const adapter = new FallbackAiAdapter(
    { modelName: 'g', generarEstrategiaPromocional: async () => { throw bug; } },
    { modelName: 'or', generarEstrategiaPromocional: async () => { secondaryCalls++; return {}; } },
    { logger: silent },
  );
  await assert.rejects(() => adapter.generarEstrategiaPromocional(PARAMS), err => err === bug);
  assert.equal(secondaryCalls, 0);
});

test('OpenRouter: un 429 del modelo principal se reintenta con el modelo de respaldo', async () => {
  const models = [];
  const adapter = new OpenRouterAdapter('k', {
    model: 'primario', fallbackModel: 'respaldo', maxAttempts: 2, retryDelayMs: 1,
    fetchImpl: (_url, init) => {
      const { model } = JSON.parse(init.body);
      models.push(model);
      return model === 'respaldo' ? completion(GOOD_JSON) : reply(429, { error: { message: 'rate limited' } });
    },
  });

  await adapter.generarEstrategiaPromocional(PARAMS);
  assert.deepEqual(models, ['primario', 'respaldo']);
});
