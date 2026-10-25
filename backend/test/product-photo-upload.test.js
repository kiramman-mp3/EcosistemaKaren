const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const request = require('supertest');
const sharp = require('sharp');
const SharpImageProcessor = require('../src/infrastructure/media/SharpImageProcessor');
const LocalMediaStorage = require('../src/infrastructure/media/LocalMediaStorage');
const { SetProductImage } = require('../src/use-cases/products/ProductUseCases');
const ProductController = require('../src/adapters/controllers/ProductController');
const groups = require('../src/infrastructure/http/routes/routeGroups');
const errorHandler = require('../src/infrastructure/http/middlewares/errorHandler');
const { createSecurityMiddlewares } = require('../src/infrastructure/http/middlewares/security');
const { isMediaPath } = require('../src/infrastructure/media/mediaPaths');
const { ValidationException, NotFoundException } = require('../src/domain/exceptions/DomainExceptions');

const PRODUCT_ID = '00000000-0000-4000-8000-000000000002';
const BARCODE = '7861001234567';

// Foto "de cámara": ruido aleatorio de 4000x3000 (12 MP) guardada como JPEG de calidad alta, con
// orientación EXIF 6 (el teléfono la tomó girado 90°) y datos de ubicación.
async function cameraPhoto({ width = 4000, height = 3000, orientation = 6 } = {}) {
  const pixels = crypto.randomBytes(width * height * 3);
  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .withExif({ IFD0: { Make: 'TelefonoPrueba', Model: 'Modelo X' }, GPS: { GPSLatitudeRef: 'S', GPSLatitude: '2/1 10/1 0/1' } })
    .withMetadata({ orientation })
    .jpeg({ quality: 95 })
    .toBuffer();
}

// ─── procesador de imágenes (sharp real) ───────────────────────────────────────────────────────
test('una foto de cámara de 12 MP se reduce a 1024 px, se endereza y queda muy por debajo de 2 MB', async () => {
  const original = await cameraPhoto();
  assert.ok(original.length > 5 * 1024 * 1024, `la foto de prueba pesa ${original.length} bytes`);

  const result = await new SharpImageProcessor().process(original);
  assert.equal(result.format, 'jpeg');
  assert.ok(result.data.length < 2 * 1024 * 1024);
  assert.ok(result.data.length < original.length / 3, `${original.length} -> ${result.data.length}`);

  const meta = await sharp(result.data).metadata();
  assert.equal(meta.format, 'jpeg');
  assert.equal(Math.max(meta.width, meta.height), 1024);
  // 4000x3000 con orientación 6 se ve como 3000x4000 (vertical): el resultado debe ser vertical y sin girar de nuevo.
  assert.ok(meta.height > meta.width, `${meta.width}x${meta.height}`);
  assert.ok(!meta.orientation || meta.orientation === 1);
  assert.equal(meta.exif, undefined, 'sin EXIF (ubicación, modelo de cámara)');
});

test('una imagen pequeña no se agranda y un PNG con transparencia sale como JPEG con fondo blanco', async () => {
  const small = await sharp({ create: { width: 300, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  const result = await new SharpImageProcessor().process(small);
  assert.equal(result.format, 'jpeg');
  assert.deepEqual([result.width, result.height], [300, 200]);
  const { data } = await sharp(result.data).raw().toBuffer({ resolveWithObject: true });
  assert.ok(data[0] > 240 && data[1] > 240 && data[2] > 240, 'el fondo transparente quedó blanco');
});

test('acepta WebP y rechaza archivos que no son imágenes, imágenes dañadas y SVG', async () => {
  const webp = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#336699' } }).webp().toBuffer();
  assert.equal((await new SharpImageProcessor().process(webp)).format, 'jpeg');

  const processor = new SharpImageProcessor();
  for (const bad of [Buffer.from('esto no es una imagen'), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), Buffer.alloc(0), Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])]) {
    await assert.rejects(() => processor.process(bad), ValidationException);
  }
});

test('rechaza una imagen con más píxeles de los permitidos sin decodificarla entera', async () => {
  // 15000x15000 = 225 MP de un solo color: pesa pocos KB pero decodificarla gastaría cientos de MB.
  const bomb = await sharp({ create: { width: 15000, height: 15000, channels: 3, background: '#000000' } }).png({ compressionLevel: 9 }).toBuffer();
  await assert.rejects(() => new SharpImageProcessor().process(bomb), /demasiados píxeles/);
});

// ─── almacenamiento y caso de uso ──────────────────────────────────────────────────────────────
async function tempMedia() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'karen-photo-'));
  return { dir, cleanup: () => fs.rm(dir, { recursive: true, force: true }) };
}

function fakeProducts(initial = {}) {
  const products = new Map([[PRODUCT_ID, { id: PRODUCT_ID, codigoBarras: BARCODE, nombre: 'Leche', imagenUrl: null, ...initial }]]);
  return {
    products,
    findById: async (id) => (products.has(id) ? { ...products.get(id) } : null),
    updateImage: async (id, url) => { products.get(id).imagenUrl = url; return { ...products.get(id) }; },
    countByImageUrl: async (url) => [...products.values()].filter(p => p.imagenUrl === url).length
  };
}

test('subir una foto la comprime, la guarda con el hash en el nombre y actualiza el producto', async () => {
  const media = await tempMedia();
  try {
    const repo = fakeProducts();
    const useCase = new SetProductImage({ productRepository: repo, imageProcessor: new SharpImageProcessor(), mediaStorage: new LocalMediaStorage({ mediaDir: media.dir }) });
    const original = await cameraPhoto({ width: 3000, height: 2000, orientation: 1 });

    const { product, image } = await useCase.execute(PRODUCT_ID, original);
    assert.match(product.imagenUrl, new RegExp(`^/api/v1/media/productos/${BARCODE}-[0-9a-f]{10}\\.jpg$`));
    assert.ok(isMediaPath(product.imagenUrl));
    assert.equal(image.originalBytes, original.length);
    assert.ok(image.bytes < original.length / 3);

    const onDisk = await fs.readFile(path.join(media.dir, 'productos', path.basename(product.imagenUrl)));
    assert.equal(onDisk.length, image.bytes);
    assert.equal((await sharp(onDisk).metadata()).width, 1024);
    assert.deepEqual((await fs.readdir(path.join(media.dir, 'productos'))).filter(name => name.endsWith('.tmp')), [], 'sin temporales');
  } finally {
    await media.cleanup();
  }
});

test('una foto nueva reemplaza a la anterior (URL nueva) y borra el archivo viejo solo si nadie más lo usa', async () => {
  const media = await tempMedia();
  try {
    const repo = fakeProducts();
    const storage = new LocalMediaStorage({ mediaDir: media.dir });
    const useCase = new SetProductImage({ productRepository: repo, imageProcessor: new SharpImageProcessor(), mediaStorage: storage });

    const first = await useCase.execute(PRODUCT_ID, await cameraPhoto({ width: 800, height: 600, orientation: 1 }));
    const second = await useCase.execute(PRODUCT_ID, await cameraPhoto({ width: 800, height: 600, orientation: 1 }));
    assert.notEqual(first.product.imagenUrl, second.product.imagenUrl);
    const files = await fs.readdir(path.join(media.dir, 'productos'));
    assert.deepEqual(files, [path.basename(second.product.imagenUrl)], 'la foto anterior se borró');

    // Con otro producto usando la misma foto, no se borra.
    repo.products.set('otro', { id: 'otro', codigoBarras: '111122', imagenUrl: second.product.imagenUrl });
    await useCase.execute(PRODUCT_ID, await cameraPhoto({ width: 800, height: 600, orientation: 1 }));
    assert.equal((await fs.readdir(path.join(media.dir, 'productos'))).length, 2);
  } finally {
    await media.cleanup();
  }
});

test('subir exactamente la misma foto otra vez no cambia nada', async () => {
  const media = await tempMedia();
  try {
    const repo = fakeProducts();
    const useCase = new SetProductImage({ productRepository: repo, imageProcessor: new SharpImageProcessor(), mediaStorage: new LocalMediaStorage({ mediaDir: media.dir }) });
    const photo = await cameraPhoto({ width: 640, height: 480, orientation: 1 });
    const first = await useCase.execute(PRODUCT_ID, photo);
    const second = await useCase.execute(PRODUCT_ID, photo);
    assert.equal(first.product.imagenUrl, second.product.imagenUrl);
    assert.equal((await fs.readdir(path.join(media.dir, 'productos'))).length, 1);
  } finally {
    await media.cleanup();
  }
});

test('si el producto no existe, el cuerpo falta o la base falla, no queda ninguna foto huérfana', async () => {
  const media = await tempMedia();
  try {
    const repo = fakeProducts();
    const useCase = new SetProductImage({ productRepository: repo, imageProcessor: new SharpImageProcessor(), mediaStorage: new LocalMediaStorage({ mediaDir: media.dir }) });
    const photo = await cameraPhoto({ width: 400, height: 300, orientation: 1 });

    await assert.rejects(() => useCase.execute('00000000-0000-4000-8000-0000000000ff', photo), NotFoundException);
    await assert.rejects(() => useCase.execute(PRODUCT_ID, undefined), ValidationException);
    await assert.rejects(() => useCase.execute(PRODUCT_ID, Buffer.alloc(0)), ValidationException);
    await assert.rejects(() => useCase.execute(PRODUCT_ID, Buffer.from('texto')), ValidationException);

    repo.updateImage = async () => { throw new Error('base caída'); };
    await assert.rejects(() => useCase.execute(PRODUCT_ID, photo), /base caída/);
    const dir = path.join(media.dir, 'productos');
    const left = await fs.readdir(dir).catch(() => []);
    assert.deepEqual(left, []);
  } finally {
    await media.cleanup();
  }
});

// ─── HTTP: autenticación, tipos y tamaño ───────────────────────────────────────────────────────
async function buildApp() {
  const media = await tempMedia();
  const repo = fakeProducts();
  const useCase = new SetProductImage({ productRepository: repo, imageProcessor: new SharpImageProcessor(), mediaStorage: new LocalMediaStorage({ mediaDir: media.dir }) });
  const controller = new ProductController(null, null, null, useCase);
  const roleFromHeader = (req, res, next) => {
    const rol = req.get('x-test-role');
    if (!rol) return res.status(401).json({ message: 'sin sesión' });
    req.user = { id: 'u1', rol };
    return next();
  };
  const authorize = (...roles) => (req, res, next) => (roles.includes(req.user.rol) ? next() : res.status(403).json({ message: 'prohibido' }));
  const security = createSecurityMiddlewares({}, { pool: null });
  const app = express();
  app.use(security.normalizeJsonBody);
  const router = express.Router();
  groups.catalogAdminRoutes(router, { productController: controller, categoryController: {} }, { authenticate: roleFromHeader, authorize });
  app.use('/api/v1', router);
  app.use(errorHandler);
  return { app, repo, media };
}

test('PUT /products/:id/image acepta la foto original de la cámara (JPEG de varios MB) y devuelve la comprimida', async () => {
  const { app, media } = await buildApp();
  try {
    const original = await cameraPhoto({ width: 4000, height: 3000, orientation: 6 });
    const response = await request(app).put(`/api/v1/products/${PRODUCT_ID}/image`).set('x-test-role', 'BODEGUERO')
      .set('content-type', 'image/jpeg').send(original);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.image.originalBytes, original.length);
    assert.ok(response.body.image.bytes < 500 * 1024, `${response.body.image.bytes} bytes`);
    assert.match(response.body.data.imagenUrl, /^\/api\/v1\/media\/productos\//);
  } finally {
    await media.cleanup();
  }
});

test('PUT /products/:id/image exige sesión y rol de ADMIN o BODEGUERO, y no lee el cuerpo antes de autenticar', async () => {
  const { app, media } = await buildApp();
  try {
    const photo = await cameraPhoto({ width: 200, height: 200, orientation: 1 });
    const put = (role) => {
      const req = request(app).put(`/api/v1/products/${PRODUCT_ID}/image`).set('content-type', 'image/jpeg');
      return (role ? req.set('x-test-role', role) : req).send(photo);
    };
    assert.equal((await put(null)).status, 401);
    assert.equal((await put('CLIENTE')).status, 403);
    assert.equal((await put('PERCHERO')).status, 403);
    assert.equal((await put('ADMIN')).status, 200);
  } finally {
    await media.cleanup();
  }
});

test('PUT /products/:id/image rechaza tipos que no son imagen, contenido falso, id inválido y fotos de más de 15 MB', async () => {
  const { app, media } = await buildApp();
  try {
    const url = `/api/v1/products/${PRODUCT_ID}/image`;
    const as = (type, body, target = url) => request(app).put(target).set('x-test-role', 'ADMIN').set('content-type', type).send(body);

    assert.equal((await as('application/json', { a: 1 })).status, 400, 'JSON sin foto');
    assert.equal((await as('text/plain', 'hola')).status, 415, 'tipo no admitido');
    assert.equal((await as('image/jpeg', Buffer.from('no soy un jpeg'))).status, 400, 'contenido que no es imagen');
    assert.equal((await as('image/svg+xml', '<svg/>')).status, 415, 'SVG no se admite');
    assert.equal((await as('image/jpeg', Buffer.from([1, 2, 3]), '/api/v1/products/no-es-uuid/image')).status, 400, 'id inválido');
    assert.equal((await as('image/jpeg', Buffer.alloc(16 * 1024 * 1024, 1))).status, 413, 'más de 15 MB');
  } finally {
    await media.cleanup();
  }
});
