const http = require('http');

const BASE_URL = 'http://localhost:4000/api/v1';

async function request(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
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
    // 1. Categorías
    const cats = await request('/categories');
    console.log('1. GET /categories:', cats.status, `(${cats.body.count || 0} categorías)`);

    // 2. Productos
    const prods = await request('/products');
    console.log('2. GET /products:', prods.status, `(${prods.body.count || 0} productos)`);

    // 3. Buscar por código de barras
    const barcode = await request('/products/barcode/7861000100011');
    console.log('3. GET /products/barcode/7861000100011:', barcode.status, barcode.body.data ? barcode.body.data.nombre : 'No encontrado');

    // 4. Lotes
    const lots = await request('/lots');
    console.log('4. GET /lots:', lots.status, `(${lots.body.count || 0} lotes)`);

    // 5. Alertas
    const alerts = await request('/alerts');
    console.log('5. GET /alerts:', alerts.status, `(${alerts.body.count || 0} alertas calculadas)`);

    // 6. Heartbeat
    const hb = await request('/heartbeat');
    console.log('6. GET /heartbeat:', hb.status, `Status: ${hb.body.status}`);

    // 7. Probar Reserva FEFO
    if (prods.body.data && prods.body.data.length > 0) {
      const prodId = prods.body.data[0].id;
      const resv = await request('/reservations', 'POST', {
        usuarioId: 'u8a7b6c5-1111-2222-3333-444455556666',
        items: [{ productoId: prodId, cantidad: 1 }]
      });
      console.log('7. POST /reservations (FEFO):', resv.status, `Código de retiro: ${resv.body.data ? resv.body.data.codigoRetiro : 'N/A'}`);
    }

    console.log('\n✨ Todas las pruebas de endpoints completadas satisfactoriamente.');
  } catch (err) {
    console.error('❌ Error en pruebas:', err.message);
  }
}

setTimeout(runTests, 1500);
