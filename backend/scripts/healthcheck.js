// HEALTHCHECK del contenedor: sale con 0 si /healthz responde 200 y con 1 en otro caso.
const port = process.env.HEALTHCHECK_PORT || process.env.STORE_PORT || process.env.PORT || 4000;

fetch(`http://127.0.0.1:${port}/healthz`, { signal: AbortSignal.timeout(3000) })
  .then(response => process.exit(response.ok ? 0 : 1))
  .catch(() => process.exit(1));
