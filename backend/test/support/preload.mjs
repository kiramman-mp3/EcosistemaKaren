import { createRequire } from 'node:module';

// El módulo es ESM para poder esperar a que la base esté lista antes de que arranque cada archivo de pruebas.
const prepare = createRequire(import.meta.url)('./prepare.js');
await prepare();
