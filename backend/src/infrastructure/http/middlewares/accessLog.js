// Registro de accesos en JSON, una línea por petición, para que un agregador de logs pueda filtrar
// por `requestId` (el mismo que devuelven las respuestas de error). Solo incluye método, ruta sin
// query string, estado y duración: nunca cabeceras, cookies ni cuerpos, donde viajan tokens y datos
// personales.
const SKIPPED_PATHS = new Set(['/healthz', '/readyz']);

function isEnabled(env) {
  if (env.ACCESS_LOG === 'true') return true;
  if (env.ACCESS_LOG === 'false') return false;
  return env.NODE_ENV === 'production';
}

function createAccessLog({ service, write = (line) => process.stdout.write(`${line}\n`), clock = () => Date.now() }) {
  return function accessLog(req, res, next) {
    const startedAt = clock();
    res.on('finish', () => {
      const path = (req.originalUrl || req.url || '').split('?')[0];
      if (SKIPPED_PATHS.has(path)) return;
      write(JSON.stringify({
        ts: new Date(clock()).toISOString(),
        level: res.statusCode >= 500 ? 'error' : 'info',
        msg: 'request',
        service,
        requestId: req.id,
        method: req.method,
        path,
        status: res.statusCode,
        durationMs: clock() - startedAt,
        ip: req.ip
      }));
    });
    next();
  };
}

module.exports = { createAccessLog, isEnabled };
