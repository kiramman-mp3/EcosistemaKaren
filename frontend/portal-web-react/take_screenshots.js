import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, '../../screenshots');
const ARTIFACTS_DIR = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\413427db-d86b-4e40-9d85-5dfacf053d6a';

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
  console.log('🚀 Iniciando Playwright para capturar pantallas del Portal Web y Módulo IA...');
  
  // 1. Asegurar heartbeat ONLINE
  try {
    const res = await fetch('http://localhost:4000/api/v1/heartbeat', { method: 'POST' });
    const data = await res.json();
    console.log('Heartbeat status:', data.status);
  } catch (e) {
    console.warn('Error enviando heartbeat:', e);
  }

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });

  const page = await context.newPage();

  try {
    // -------------------------------------------------------------
    // PARTE 1: PORTAL WEB REACT (http://localhost:5173/)
    // -------------------------------------------------------------
    console.log('Navigating to Portal Web React (http://localhost:5173/)...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Asegurar scroll en la parte superior
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);

    // 1. Portal Web - Vista de Inicio
    console.log('1. Capturando Inicio del Portal Web...');
    await saveScreenshot(page, '01_portal_web_inicio.png');

    // 2. Portal Web - Catálogo de Productos
    console.log('2. Navegando y capturando Catálogo de Productos...');
    await page.click('button:has-text("Productos")');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);
    await saveScreenshot(page, '02_portal_web_catalogo.png');

    // 3. Portal Web - Módulo de IA (Ofertas Flash & Descuentos Gemini AI)
    console.log('3. Navegando al Módulo de IA (Ofertas Flash)...');
    await page.click('button:has-text("Ofertas")');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1200);
    await saveScreenshot(page, '03_portal_web_modulo_ia_ofertas.png');

    // 4. Portal Web - Generación en vivo con Gemini IA
    console.log('4. Ejecutando botón "Generar Oferta Dinámica con IA"...');
    const aiBtn = await page.$('button:has-text("Generar Oferta Dinámica con IA")');
    if (aiBtn) {
      await aiBtn.click();
      await page.waitForTimeout(2500);
      await saveScreenshot(page, '04_portal_web_modulo_ia_generada.png');
    }

    // 5. Portal Web - Modal de Reserva y Pase QR Anti-Overbooking
    console.log('5. Capturando Pase Digital de Reserva Anti-Overbooking...');
    await page.click('button:has-text("Inicio")');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    
    // Clic en la tarjeta flotante de reserva del Hero
    const stockCard = await page.$('text=Stock confirmado');
    if (stockCard) {
      await stockCard.click();
      await page.waitForTimeout(1200);
      await saveScreenshot(page, '05_portal_web_reserva_pass.png');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // -------------------------------------------------------------
    // PARTE 2: HUB ECOSISTEMA KAREN (http://localhost:3000/index.html)
    // -------------------------------------------------------------
    console.log('Navigating to Dashboard Ecosistema Karen (http://localhost:3000/index.html)...');
    try {
      await fetch('http://localhost:4000/api/v1/heartbeat', { method: 'POST' });
    } catch (e) {}

    await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      if (typeof checkHeartbeat === 'function') checkHeartbeat();
    });
    await page.waitForTimeout(500);

    // 6. Dashboard - Módulo de IA Gemini
    console.log('6. Accediendo a la pestaña "Promociones Gemini IA"...');
    await page.click('[data-tab="tab-ai"]');
    await page.waitForTimeout(1500);
    await saveScreenshot(page, '06_dashboard_modulo_ia_gemini.png');

    // 7. Dashboard - Generar Sugerencia de Promoción con IA
    console.log('7. Seleccionando lote y generando sugerencia IA...');
    const lotOptions = await page.$$('#aiLotSelect option');
    if (lotOptions.length > 1) {
      const val = await lotOptions[1].getAttribute('value');
      if (val) {
        await page.selectOption('#aiLotSelect', val);
        await page.waitForTimeout(500);
      }
    }

    const genBtn = await page.$('#btnAiGenerate');
    if (genBtn) {
      await genBtn.click();
      await page.waitForTimeout(2500);
      await saveScreenshot(page, '07_dashboard_modulo_ia_sugerencia.png');
    }

    console.log('✅ Todas las capturas fueron tomadas exitosamente!');
  } catch (error) {
    console.error('Error durante la toma de capturas:', error);
  } finally {
    await browser.close();
  }
}

run();
