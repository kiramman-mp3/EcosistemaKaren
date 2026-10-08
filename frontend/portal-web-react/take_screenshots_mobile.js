import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, '../../screenshots');
const ARTIFACTS_DIR = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\6fabf245-46bc-4c8d-a675-429b2886a8a3';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function saveScreenshot(page, filename, options = {}) {
  const localPath = path.join(OUTPUT_DIR, filename);
  const artifactPath = path.join(ARTIFACTS_DIR, filename);
  
  await page.screenshot({ path: localPath, ...options });
  fs.copyFileSync(localPath, artifactPath);
  console.log(`[Captured] ${filename} -> ${localPath} & ${artifactPath}`);
}

async function run() {
  console.log('🚀 Iniciando Playwright para capturar pantallas responsivas completas de Bodega Móvil y Portal Móvil...');
  
  // 1. Asegurar señal Heartbeat ONLINE en Backend
  try {
    const res = await fetch('http://localhost:4000/api/v1/heartbeat', { method: 'POST' });
    const data = await res.json();
    console.log('Backend Heartbeat status:', data.status);
  } catch (e) {
    console.warn('Advertencia al consultar heartbeat:', e.message);
  }

  const browser = await chromium.launch({
    headless: true,
  });

  // Emulación de dispositivo móvil (iPhone 14 / Flagship responsivo 393x852 @2x)
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  });

  const page = await context.newPage();

  try {
    // =========================================================================
    // PARTE 1: BODEGA MÓVIL REACT NATIVE (http://localhost:8085/)
    // =========================================================================
    console.log('\n--- CAPTURANDO BODEGA MÓVIL (http://localhost:8085/) ---');
    await page.goto('http://localhost:8085/', { waitUntil: 'networkidle', timeout: 35000 });
    await page.waitForTimeout(1500);

    // 1. Bodega Móvil - Ingreso de Lote Inicial
    console.log('1. Capturando Ingreso de Lote (Formulario Inicial)...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await saveScreenshot(page, 'mobile_bodega_01_ingreso_lote.png');

    // 2. Bodega Móvil - Simulación de Escaneo con Pistola / Lector
    console.log('2. Simulando escaneo de producto Leche (0011)...');
    const scanBtn = await page.$('text=📲 Leche (0011)');
    if (scanBtn) {
      await scanBtn.click();
      await page.waitForTimeout(800);
      await saveScreenshot(page, 'mobile_bodega_02_ingreso_lote_escaneado.png');
    }

    // 3. Bodega Móvil - Pestaña Alertas Caducidad FEFO
    console.log('3. Navegando a Alertas de Caducidad FEFO...');
    await page.click('text=Alertas');
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await saveScreenshot(page, 'mobile_bodega_03_alertas_caducidad_fefo.png');

    // 4. Bodega Móvil - Modal de Promoción con IA Gemini
    console.log('4. Abriendo Modal de Promoción con IA Gemini...');
    await page.click('text=✨ Promo Gemini IA');
    await page.waitForTimeout(2000);
    await saveScreenshot(page, 'mobile_bodega_04_modal_ia_promocion.png');

    // 5. Bodega Móvil - Modal de Merma / Baja de Inventario
    console.log('5. Abriendo Modal de Merma / Baja...');
    await page.goto('http://localhost:8085/');
    await page.waitForTimeout(600);
    await page.click('text=Alertas');
    await page.waitForTimeout(800);
    await page.click('text=⚠️ Merma');
    await page.waitForTimeout(1000);
    await saveScreenshot(page, 'mobile_bodega_05_modal_merma_baja.png');

    // 6. Bodega Móvil - Pestaña Inventario de Lotes
    console.log('6. Navegando a Inventario de Lotes...');
    await page.goto('http://localhost:8085/');
    await page.waitForTimeout(600);
    await page.click('text=Inventario');
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await saveScreenshot(page, 'mobile_bodega_06_inventario_lotes.png');

    // 7. Bodega Móvil - Pestaña Caja SIACI
    console.log('7. Navegando a Caja SIACI...');
    await page.click('text=Caja SIACI');
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await saveScreenshot(page, 'mobile_bodega_07_caja_siaci_busqueda.png');

    // 8. Bodega Móvil - Validar PIN de Reserva en Caja SIACI
    console.log('8. Validando PIN de reserva sugerido KR-X7Y9Z2...');
    await page.click('text=KR-X7Y9Z2');
    await page.waitForTimeout(400);
    await page.click('text=Validar PIN');
    await page.waitForTimeout(1500);
    await saveScreenshot(page, 'mobile_bodega_08_caja_siaci_reserva_validada.png');


    // =========================================================================
    // PARTE 2: PORTAL MÓVIL REACT NATIVE (http://localhost:8086/)
    // =========================================================================
    console.log('\n--- CAPTURANDO PORTAL MÓVIL (http://localhost:8086/) ---');
    await page.goto('http://localhost:8086/', { waitUntil: 'networkidle', timeout: 35000 });
    await page.waitForTimeout(1500);

    // 9. Portal Móvil - Vista de Inicio / Hero
    console.log('9. Capturando Inicio del Portal Móvil (Hero & Header)...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    await saveScreenshot(page, 'mobile_portal_01_inicio_hero.png');

    // 10. Portal Móvil - Categorías Grid
    console.log('10. Desplazando hacia la grilla de Categorías...');
    await page.locator('text=Explora por categoría').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await saveScreenshot(page, 'mobile_portal_02_categorias_grid.png');

    // 10b. Portal Móvil - Banner Anti-Overbooking
    console.log('10b. Desplazando hacia el Banner Anti-Overbooking...');
    await page.locator('text=✨ Sistema patentado').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await saveScreenshot(page, 'mobile_portal_02_banner_antioverbooking.png');

    // 11. Portal Móvil - Pestaña Productos (Catálogo Responsivo)
    console.log('11. Navegando a Productos (Catálogo)...');
    await page.goto('http://localhost:8086/');
    await page.waitForTimeout(600);
    await page.click('text=Productos');
    await page.waitForTimeout(1200);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    await saveScreenshot(page, 'mobile_portal_03_catalogo_productos.png');

    // 12. Portal Móvil - Pestaña Ofertas Flash con Gemini IA
    console.log('12. Navegando a Ofertas Flash con IA...');
    await page.click('text=Ofertas');
    await page.waitForTimeout(1200);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    await saveScreenshot(page, 'mobile_portal_04_ofertas_flash_ia.png');

    // 13. Portal Móvil - Acción de Reserva Inmediata de Oferta Flash
    console.log('13. Reservando stock de oferta flash en tiempo real...');
    const reserveOfferBtn = await page.$('text=Reservar Stock Ahora →');
    if (reserveOfferBtn) {
      await reserveOfferBtn.click();
      await page.waitForTimeout(1000);
      await saveScreenshot(page, 'mobile_portal_05_oferta_reservada.png');
    }

    // 14. Portal Móvil - Modal Pase QR de Reserva Anti-Overbooking
    console.log('14. Abriendo Modal de Pase Digital QR Anti-Overbooking...');
    await page.goto('http://localhost:8086/');
    await page.waitForTimeout(800);
    await page.click('text=Stock confirmado');
    await page.waitForTimeout(1200);
    await saveScreenshot(page, 'mobile_portal_06_modal_pase_qr.png');

    // 15. Portal Móvil - Drawer / Modal de Carrito
    console.log('15. Abriendo Carrito de Compras...');
    await page.goto('http://localhost:8086/');
    await page.waitForTimeout(800);
    await page.click('text=🛒');
    await page.waitForTimeout(1000);
    await saveScreenshot(page, 'mobile_portal_07_drawer_carrito.png');

    // 16. Portal Móvil - Modal de Inicio de Sesión
    console.log('16. Abriendo Modal de Login...');
    await page.goto('http://localhost:8086/');
    await page.waitForTimeout(800);
    await page.click('text=Acceder');
    await page.waitForTimeout(1000);
    await saveScreenshot(page, 'mobile_portal_08_modal_login.png');

    // 17. Portal Móvil - Modal Buscar / Validar PIN de Reserva
    console.log('17. Abriendo Modal Buscar Reserva por PIN...');
    await page.goto('http://localhost:8086/');
    await page.waitForTimeout(800);
    await page.click('text=PIN');
    await page.waitForTimeout(800);

    // Escribir PIN y consultar para ver el detalle de la reserva
    await page.fill('input[placeholder*="KR-"]', 'KR-X7Y9Z2');
    await page.waitForTimeout(400);
    await page.click('text=Consultar');
    await page.waitForTimeout(1200);
    await saveScreenshot(page, 'mobile_portal_09_modal_buscar_pin.png');

    console.log('\n🎉 ¡Todas las capturas responsivas móviles fueron generadas y guardadas exitosamente!');

  } catch (error) {
    console.error('❌ Error capturando pantallas móviles:', error);
  } finally {
    await browser.close();
  }
}

run();
