const path = require('path');
const fs = require('fs');

// Cargar playwright desde la caché de npm donde está instalado
const playwrightPath = 'C:/Users/USER/AppData/Local/npm-cache/_npx/1196d833f288caa4/node_modules/playwright';
const { chromium } = require(playwrightPath);

const SCREENSHOTS_DIR = path.resolve(__dirname);
const BASE_URL = 'http://localhost:8081';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('🚀 Iniciando Chromium con emulación móvil iPhone 14 (390x844)...');
  const executablePath = 'C:/Users/USER/AppData/Local/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-win64/chrome-headless-shell.exe';
  const browser = await chromium.launch({
    headless: true,
    executablePath,
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  });

  const page = await context.newPage();

  // Descartar automáticamente diálogos alert/confirm nativos si aparecen
  page.on('dialog', async dialog => {
    console.log(`💬 Diálogo detectado: [${dialog.type()}] ${dialog.message()}`);
    await dialog.accept();
  });

  // Interceptar endpoint de generación IA para garantizar modal de IA impecable
  await page.route('**/api/v1/promotions/generate', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'promo-gen-01',
          loteId: 'b9a8f7e6-1111-2222-3333-444455556666',
          descuentoPorcentaje: 40,
          frasePromocional: '¡Oferta Flash IA! 40% de descuento en Yogurt Griego Toni Natural antes de su fecha FEFO.',
          razonIa: 'Lote crítico con 4 días restantes en percha. Se sugiere acelerar la rotación para evitar merma y fidelizar clientes.',
          estado: 'PENDIENTE_APROBACION',
          activa: false,
        }
      })
    });
  });

  // Interceptar listado de promociones gestionadas para que Ofertas muestre estado variado
  await page.route('**/api/v1/promotions/manage*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'promo-01',
            loteId: 'b9a8f7e6-1111-2222-3333-444455556666',
            productoNombre: 'Yogurt Griego Toni Natural 500g',
            numeroLote: 'LOT-YG-2026-01',
            fechaCaducidad: new Date(Date.now() + 4 * 86400000).toISOString(),
            descuentoPorcentaje: 40,
            frasePromocional: '¡Oferta Flash IA! 40% OFF en Yogurt Griego Toni 500g antes de su fecha FEFO.',
            razonIa: 'Lote crítico con 4 días restantes en percha y alta demanda potencial.',
            estado: 'PENDIENTE_APROBACION',
            activa: false,
          },
          {
            id: 'promo-02',
            loteId: 'b9a8f7e6-1111-2222-3333-444455556670',
            productoNombre: 'Pan Artesanal de Masa Madre',
            numeroLote: 'LOT-PN-2026-05',
            fechaCaducidad: new Date(Date.now() + 2 * 86400000).toISOString(),
            descuentoPorcentaje: 35,
            frasePromocional: '¡Horneado del día! 35% de descuento en Pan Artesanal de Masa Madre.',
            razonIa: 'Producto de panadería de alta frescura con consumo inmediato.',
            estado: 'APROBADA',
            activa: true,
          }
        ]
      })
    });
  });

  // Interceptar movimientos y mermas para reportes ricos en datos
  await page.route('**/api/v1/inventory/movements*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { id: 'mov-1', tipo: 'INGRESO', productoNombre: 'Leche Entera Pasteurizada 1 Litro', numeroLote: 'LOT-VT-2026-02', cantidad: 100, ubicacion: 'BODEGA', usuarioNombre: 'Nancy Alvares', createdAt: new Date(Date.now() - 3600000).toISOString() },
          { id: 'mov-2', tipo: 'TRASLADO', productoNombre: 'Yogurt Griego Toni Natural 500g', numeroLote: 'LOT-YG-2026-01', cantidad: 25, ubicacion: 'PERCHA', usuarioNombre: 'Nancy Alvares', createdAt: new Date(Date.now() - 7200000).toISOString() },
          { id: 'mov-3', tipo: 'MERMA', productoNombre: 'Pan Artesanal de Masa Madre', numeroLote: 'LOT-PN-2026-05', cantidad: 4, ubicacion: 'PERCHA', usuarioNombre: 'Admin Supermercado', createdAt: new Date(Date.now() - 14400000).toISOString() },
          { id: 'mov-4', tipo: 'VENTA', productoNombre: 'Corte Lomo Fino de Res Premium', numeroLote: 'LOT-CR-2026-03', cantidad: 2, ubicacion: 'PERCHA', usuarioNombre: 'Caja SIACI', createdAt: new Date(Date.now() - 28800000).toISOString() }
        ]
      })
    });
  });

  await page.route('**/api/v1/inventory/wastes*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { id: 'w-1', movimientoId: 'mov-3', productoNombre: 'Pan Artesanal de Masa Madre', numeroLote: 'LOT-PN-2026-05', cantidad: 4, razon: 'Empaque dañado en percha', costoTotal: 5.18, usuarioNombre: 'Admin Supermercado', createdAt: new Date(Date.now() - 14400000).toISOString() }
        ]
      })
    });
  });

  // ── 1. Pantalla de Login inicial ──
  console.log('📸 1. Capturando pantalla de login inicial...');
  await page.goto(BASE_URL);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.waitForSelector('text=Bodega Karen', { timeout: 15000 });
  await delay(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_login_inicial.png') });

  // ── 2. Error de login con contraseña errónea ──
  console.log('📸 2. Capturando error de credenciales...');
  const emailInput = page.locator('input[aria-label="Correo"], input[type="email"], input[type="text"]').first();
  const passwordInput = page.locator('input[aria-label="Contraseña"], input[type="password"]').first();
  await emailInput.fill('bodega@karen.com');
  await passwordInput.fill('clave_incorrecta');
  await page.locator('text=Ingresar').first().click();
  await page.waitForSelector('text=Contraseña incorrecta', { timeout: 6000 }).catch(() => delay(1500));
  await delay(800);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_login_error_credenciales.png') });

  // ── 3. Ingreso con usuario ADMIN (acceso a todos los módulos) ──
  console.log('📸 3. Iniciando sesión como ADMIN...');
  await emailInput.fill('admin@karen.com');
  await passwordInput.fill('demo123');
  await page.locator('text=Ingresar').first().click();

  await page.waitForSelector('text=Recepción de Lote', { timeout: 15000 }).catch(() => {
    return page.waitForSelector('text=Bodega Karen', { timeout: 10000 });
  });
  await delay(2000);

  // ── 4. Pantalla "Recibir" (Ingreso de Lote vacío) ──
  console.log('📸 4. Capturando pantalla Recibir (formulario inicial)...');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_recibir_ingreso_lote_vacio.png') });

  // ── 5. Recibir con código de barras reconocido ──
  console.log('📸 5. Ingresando código EAN-13...');
  const barcodeInput = page.locator('input[aria-label="Código de barras (EAN-13 / GTIN)"], input[placeholder*="786"], input[type="text"]').first();
  if (await barcodeInput.isVisible()) {
    await barcodeInput.fill('7861000100014');
    await delay(1800);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_recibir_producto_detectado.png') });
  }

  // ── 6. Pestaña "Por vencer" (Alertas FEFO) ──
  console.log('📸 6. Navegando a pestaña "Por vencer"...');
  const alertasTab = page.locator('text=Por vencer').first();
  await alertasTab.click();
  await delay(1500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_alertas_caducidad_fefo.png') });

  // ── 7. Filtro Críticos (Menos de 7 días) ──
  console.log('📸 7. Filtrando por Menos de 7 días...');
  const criticosChip = page.locator('text=Menos de 7 días').first();
  if (await criticosChip.isVisible()) {
    await criticosChip.click();
    await delay(800);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_alertas_caducidad_filtro_criticos.png') });
  }

  // ── 8. Modal de Asistente IA Promoción ──
  console.log('📸 8. Abriendo modal Asistente IA (Crear oferta)...');
  const crearOfertaBtn = page.locator('text=Crear oferta').first();
  if (await crearOfertaBtn.isVisible()) {
    await crearOfertaBtn.click();
    await page.waitForSelector('text=Oferta sugerida', { timeout: 8000 }).catch(() => delay(2000));
    await delay(1200);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_modal_asistente_ia_promocion.png') });

    // Cerrar modal IA
    const closeAiBtn = page.locator('text=Más tarde').or(page.locator('[aria-label="Cerrar"]')).first();
    if (await closeAiBtn.isVisible()) {
      await closeAiBtn.click();
      await delay(800);
    }
  }

  // ── 9. Modal de Registrar Merma ──
  console.log('📸 9. Abriendo modal de Registrar Merma...');
  const todosChip = page.locator('text=Todos').first();
  if (await todosChip.isVisible()) {
    await todosChip.click();
    await delay(600);
  }
  const mermaBtn = page.locator('text=Merma').first();
  if (await mermaBtn.isVisible()) {
    await mermaBtn.click();
    await page.waitForSelector('text=Registrar merma', { timeout: 6000 }).catch(() => delay(1000));
    await delay(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_modal_registrar_merma.png') });

    // Cerrar modal de merma haciendo clic en la X de cerrar
    const closeMermaBtn = page.locator('[aria-label="Cerrar"]').first();
    if (await closeMermaBtn.isVisible()) {
      await closeMermaBtn.click();
      await delay(800);
    }
  }

  // ── 10. Pestaña "Lotes" (Inventario de Lotes) ──
  console.log('📸 10. Navegando a pestaña "Lotes"...');
  const inventarioTab = page.locator('text=Lotes').first();
  await inventarioTab.click();
  await delay(1500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_inventario_lotes.png') });

  // ── 11. Pestaña "Caja" (Caja SIACI inicio) ──
  console.log('📸 11. Navegando a pestaña "Caja"...');
  const cajaTab = page.locator('text=Caja').first();
  await cajaTab.click();
  await delay(1200);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_caja_siaci_inicio.png') });

  // ── 12. Caja SIACI con reserva recuperada ──
  console.log('📸 12. Consultando código de reserva KR-X7Y9Z2...');
  const pinInput = page.locator('input[aria-label="Código de retiro o PIN"], input[placeholder*="KR-"], input[type="text"]').first();
  if (await pinInput.isVisible()) {
    await pinInput.fill('KR-X7Y9Z2');
    const buscarBtn = page.locator('text=Buscar').first();
    await buscarBtn.click();
    await page.waitForSelector('text=Por cobrar', { timeout: 8000 }).catch(() => delay(2000));
    await delay(1200);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_caja_siaci_reserva_encontrada.png') });
  }

  // ── 13. Pestaña "Catálogo" ──
  console.log('📸 13. Navegando a pestaña "Catálogo"...');
  const catalogoTab = page.locator('text=Catálogo').first();
  await catalogoTab.click();
  await delay(1500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12_catalogo_productos.png') });

  // ── 14. Pestaña "Ofertas" (Aprobaciones de promociones IA) ──
  console.log('📸 14. Navegando a pestaña "Ofertas"...');
  const ofertasTab = page.locator('text=Ofertas').first();
  if (await ofertasTab.isVisible()) {
    await ofertasTab.click();
    await delay(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13_admin_aprobaciones_ofertas.png') });

    // Clic en la tarjeta de oferta para abrir modal de revisión
    const cardOferta = page.locator('text=Yogurt Griego Toni Natural 500g').first();
    if (await cardOferta.isVisible()) {
      await cardOferta.click();
      await delay(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14_admin_modal_revision_oferta.png') });
      const cerrarOfertaModal = page.locator('text=Cancelar').or(page.locator('[aria-label="Cerrar"]')).first();
      if (await cerrarOfertaModal.isVisible()) {
        await cerrarOfertaModal.click();
        await delay(600);
      }
    }
  }

  // ── 15. Reportes (Movimientos y mermas) ──
  console.log('📸 15. Abriendo pantalla de Reportes...');
  const profileBtn = page.locator('[aria-label="Abrir perfil"]').first();
  if (await profileBtn.isVisible()) {
    await profileBtn.click();
    await delay(600);
    const reportesMenu = page.locator('text=Movimientos y mermas').first();
    await reportesMenu.click();
    await delay(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15_reportes_movimientos_y_mermas.png') });
  }

  console.log('🎉 ¡Todas las capturas se completaron y guardaron con éxito en screenshots/!');
  await browser.close();
}

run().catch(err => {
  console.error('❌ Error capturando pantallas:', err);
  process.exit(1);
});
