const http = require('http');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';

async function request(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', err => reject(err));

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Iniciando verificación de endpoints del backend...\n');

  try {
    const expectStatus = (label, response, expected) => {
      if (response.status !== expected) {
        throw new Error(`${label}: se esperaba HTTP ${expected}, se recibió ${response.status}. Respuesta: ${JSON.stringify(response.body)}`);
      }
    };

    const clientLogin = await request('/auth/login', 'POST', {
      email: 'cliente@karen.com',
      password: 'demo123'
    });
    expectStatus('POST /auth/login (cliente)', clientLogin, 200);
    const clientToken = clientLogin.body.data.token;

    const warehouseLogin = await request('/auth/login', 'POST', {
      email: 'bodega@karen.com',
      password: 'demo123'
    });
    expectStatus('POST /auth/login (bodega)', warehouseLogin, 200);
    const warehouseToken = warehouseLogin.body.data.token;

    // 1. Categorías
    const cats = await request('/categories');
    expectStatus('GET /categories', cats, 200);
    console.log('1. GET /categories:', cats.status, `(${cats.body.count || 0} categorías)`);

    // 2. Productos
    const prods = await request('/products');
    expectStatus('GET /products', prods, 200);
    console.log('2. GET /products:', prods.status, `(${prods.body.count || 0} productos)`);

    // 3. Buscar por código de barras
    const barcode = await request('/products/barcode/7861000100011');
    expectStatus('GET /products/barcode/:barcode', barcode, 200);
    console.log('3. GET /products/barcode/7861000100011:', barcode.status, barcode.body.data ? barcode.body.data.nombre : 'No encontrado');

    // 4. Lotes
    const lots = await request('/lots', 'GET', null, warehouseToken);
    expectStatus('GET /lots', lots, 200);
    console.log('4. GET /lots:', lots.status, `(${lots.body.count || 0} lotes)`);

    // 5. Alertas
    const alerts = await request('/alerts', 'GET', null, warehouseToken);
    expectStatus('GET /alerts', alerts, 200);
    console.log('5. GET /alerts:', alerts.status, `(${alerts.body.count || 0} alertas calculadas)`);

    // 6. Sin heartbeat, reservar debe fallar sin tocar stock
    if (prods.body.data && prods.body.data.length > 0) {
      const blockedReservation = await request('/reservations', 'POST', {
        items: [{ productoId: prods.body.data[0].id, cantidad: 1 }]
      }, clientToken);
      expectStatus('POST /reservations sin heartbeat', blockedReservation, 503);
    }

    // Heartbeat operativo obligatorio antes de reservar
    const heartbeatPing = await request('/heartbeat', 'POST', {}, warehouseToken);
    expectStatus('POST /heartbeat', heartbeatPing, 200);
    const hb = await request('/heartbeat');
    expectStatus('GET /heartbeat', hb, 200);
    if (hb.body.reservationsBlocked) {
      throw new Error('GET /heartbeat: las reservas continúan bloqueadas después del ping.');
    }
    console.log('6. POST/GET /heartbeat:', hb.status, `Status: ${hb.body.status}`);

    // 7. Probar Reserva FEFO
    if (prods.body.data && prods.body.data.length > 0) {
      const prodId = prods.body.data[0].id;
      const resv = await request('/reservations', 'POST', {
        items: [{ productoId: prodId, cantidad: 1 }]
      }, clientToken);
      expectStatus('POST /reservations', resv, 201);
      console.log('7. POST /reservations (FEFO):', resv.status, `Código de retiro: ${resv.body.data ? resv.body.data.codigoRetiro : 'N/A'}`);

      const cancellation = await request(
        `/reservations/${resv.body.data.id}/cancel`,
        'POST',
        null,
        clientToken
      );
      expectStatus('POST /reservations/:id/cancel', cancellation, 200);
      console.log('8. POST /reservations/:id/cancel:', cancellation.status, '(stock restaurado)');
    }

    console.log('\n✨ Todas las pruebas de endpoints completadas satisfactoriamente.');
  } catch (err) {
    console.error('❌ Error en pruebas:', err.message);
    process.exitCode = 1;
  }
}

setTimeout(runTests, 1500);
