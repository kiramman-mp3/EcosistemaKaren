const fs = require('fs');
const path = require('path');
const express = require('express');

// Rutas que pertenecen al backend: nunca se contestan con el index.html de la SPA.
const BACKEND_PREFIXES = ['/api', '/internal', '/healthz', '/readyz', '/api-docs'];

function isBackendPath(requestPath) {
  return BACKEND_PREFIXES.some(prefix => requestPath === prefix || requestPath.startsWith(`${prefix}/`));
}

// Sirve un frontend compilado (Vite) desde `dir`. Con el portal web y portal-api en el mismo
// origen la cookie de sesión SameSite=Strict funciona sin dominio propio ni CORS.
function createStaticSite(dir) {
  const root = path.resolve(dir);
  const indexFile = path.join(root, 'index.html');
  if (!fs.existsSync(indexFile)) {
    throw new Error(`PORTAL_STATIC_DIR no contiene index.html: ${root}`);
  }

  const router = express.Router();

  // Los archivos de /assets llevan hash en el nombre; el resto (index.html, sw.js, manifest)
  // debe revalidarse para que una versión nueva llegue sin esperar a que caduque la caché.
  router.use(express.static(root, {
    index: false,
    setHeaders(res, filePath) {
      const immutable = filePath.startsWith(path.join(root, 'assets') + path.sep);
      res.setHeader('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache');
    }
  }));

  // Fallback de la SPA: cualquier ruta de navegación devuelve index.html.
  router.use((req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || isBackendPath(req.path)) return next();
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(indexFile);
  });

  return router;
}

module.exports = { createStaticSite, isBackendPath };
