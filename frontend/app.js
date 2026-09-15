/* =============================================================================
   Ecosistema Karen - Frontend Application Logic
   ============================================================================= */

let API_BASE_URL = localStorage.getItem('karen_api_url') || 'http://localhost:4000/api/v1';

let state = {
  products: [],
  lots: [],
  alerts: [],
  promotions: [],
  selectedProductId: null,
  activePinReservation: null,
  sseEventSource: null
};

// --- DOM Loaded Bootstrap ---
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  document.getElementById('apiBaseUrlInput').value = API_BASE_URL;

  // Cargas iniciales
  checkHeartbeat();
  setInterval(checkHeartbeat, 10000); // Polling de latido cada 10s

  initSseStream();
  loadCatalog();
  loadLots();
  loadAlerts();
  loadActivePromotions();
});

// --- Tabs Management ---
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(tabId).classList.add('active');

      if (tabId === 'tab-catalog') loadCatalog();
      if (tabId === 'tab-lots') loadLots();
      if (tabId === 'tab-ai') populateAiLotSelect();
      if (tabId === 'tab-sse') loadAlerts();
    });
  });
}

// --- Heartbeat Status Monitor ---
async function checkHeartbeat() {
  const dot = document.getElementById('heartbeatDot');
  const statusTxt = document.getElementById('heartbeatStatus');

  try {
    const res = await fetch(`${API_BASE_URL}/heartbeat`);
    const data = await res.json();

    if (data.status === 'ONLINE') {
      dot.classList.remove('offline');
      statusTxt.textContent = 'ONLINE (TIENDA)';
      statusTxt.style.color = 'var(--accent-emerald)';
    } else {
      dot.classList.add('offline');
      statusTxt.textContent = 'OFFLINE (BLOQUEADO)';
      statusTxt.style.color = 'var(--accent-rose)';
    }
  } catch (e) {
    dot.classList.add('offline');
    statusTxt.textContent = 'DESCONECTADO';
    statusTxt.style.color = 'var(--accent-rose)';
  }
}

// --- SSE Event Stream ---
function initSseStream() {
  if (state.sseEventSource) {
    state.sseEventSource.close();
  }

  const consoleBody = document.getElementById('sseConsole');
  const sseStatus = document.getElementById('sseClients');

  try {
    const sseUrl = `${API_BASE_URL}/alerts/stream`;
    state.sseEventSource = new EventSource(sseUrl);

    state.sseEventSource.onopen = () => {
      sseStatus.textContent = 'EN VIVO';
      sseStatus.style.color = 'var(--accent-cyan)';
    };

    state.sseEventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const timeStr = new Date().toLocaleTimeString();

        const line = document.createElement('div');
        line.className = 'console-line event-line';
        line.textContent = `[${timeStr}] EVENTO SSE: ${JSON.stringify(payload)}`;
        consoleBody.appendChild(line);
        consoleBody.scrollTop = consoleBody.scrollHeight;

        showToast(`📡 Alerta SSE: Lote ${payload.numeroLote} (${payload.diasParaVencer} días)`);
        loadAlerts();
      } catch (err) {
        console.log('SSE Data Text:', event.data);
      }
    };

    state.sseEventSource.onerror = () => {
      sseStatus.textContent = 'RECONECTANDO...';
      sseStatus.style.color = 'var(--accent-amber)';
    };
  } catch (err) {
    console.error('Error al iniciar SSE:', err);
  }
}

function clearSseLog() {
  document.getElementById('sseConsole').innerHTML = '';
}

// --- API Helper ---
async function apiFetch(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error en la petición a la API');
  }
  return data;
}

// --- Tab 1: Catálogo & Reservas ---
async function loadCatalog() {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '<div class="loading-state">Cargando productos...</div>';

  try {
    const resProds = await apiFetch('/products');
    const resLots = await apiFetch('/lots');
    state.products = resProds.data || [];
    state.lots = resLots.data || [];

    if (state.products.length === 0) {
      grid.innerHTML = '<div class="loading-state">No hay productos en el catálogo.</div>';
      return;
    }

    grid.innerHTML = '';
    state.products.forEach(prod => {
      // Calcular stock total disponible agrupando lotes activos
      const prodLots = state.lots.filter(l => l.productoId === prod.id);
      const stockDisponible = prodLots.reduce((sum, l) => sum + (l.cantidadDisponible || 0), 0);
      const earliestExpiry = prodLots.length > 0
        ? new Date(Math.min(...prodLots.map(l => new Date(l.fechaCaducidad))))
        : null;

      const expiryStr = earliestExpiry
        ? earliestExpiry.toLocaleDateString()
        : 'Sin Lote';

      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <div>
          <div class="prod-header">
            <div>
              <div class="prod-title">${prod.nombre}</div>
              <div class="prod-barcode">EAN: ${prod.codigoBarras}</div>
            </div>
            <div class="prod-price">$${parseFloat(prod.precioVenta).toFixed(2)}</div>
          </div>
          <div class="prod-details">
            <div class="prod-meta">
              <span>Stock Disponible:</span>
              <strong style="color: ${stockDisponible > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}">
                ${stockDisponible} unidades
              </strong>
            </div>
            <div class="prod-meta">
              <span>Próxima Caducidad (FEFO):</span>
              <strong>${expiryStr}</strong>
            </div>
          </div>
        </div>
        <button class="btn btn-primary w-100 margin-top-md" 
          onclick="openReservationModal('${prod.id}', '${prod.nombre.replace(/'/g, "\\'")}')"
          ${stockDisponible <= 0 ? 'disabled' : ''}>
          🎟️ Reservar Stock Anti-Overbooking
        </button>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = `<div class="loading-state" style="color: var(--accent-rose)">❌ ${err.message}</div>`;
  }
}

function openReservationModal(productId, productName) {
  state.selectedProductId = productId;
  document.getElementById('modalProductName').textContent = productName;
  document.getElementById('modalReserveQty').value = 1;
  openModal('reservationModal');
}

async function submitReservation() {
  const qty = parseInt(document.getElementById('modalReserveQty').value, 10);
  if (!qty || qty <= 0) return alert('Ingresa una cantidad válida.');

  try {
    const payload = {
      usuarioId: 'u8a7b6c5-1111-2222-3333-444455556666', // Cliente demo
      items: [{ productoId: state.selectedProductId, cantidad: qty }]
    };

    const res = await apiFetch('/reservations', 'POST', payload);
    closeModal('reservationModal');

    const pin = res.data.codigoRetiro;
    showToast(`🎟️ ¡Reserva exitosa! Código de cobro PIN: ${pin}`);
    
    alert(`✅ RESERVA GENERADA CON ÉXITO\n\nPIN para Caja SIACI: ${pin}\nEstado: PENDIENTE (Expira en 10 minutos)\n\nConserva este PIN para validarlo en la pestaña de cobro.`);

    loadCatalog();
  } catch (err) {
    alert(`❌ Error al reservar: ${err.message}`);
  }
}

// Validar PIN en Caja Modal
function openConfirmModal() {
  document.getElementById('pinCodeInput').value = '';
  document.getElementById('pinDetailsContainer').innerHTML = '';
  document.getElementById('btnConfirmPay').disabled = true;
  state.activePinReservation = null;
  openModal('confirmPinModal');
}

async function lookupPinCode() {
  const code = document.getElementById('pinCodeInput').value.trim().toUpperCase();
  if (!code) return alert('Ingresa un código PIN.');

  const container = document.getElementById('pinDetailsContainer');
  container.innerHTML = 'Buscando reserva...';

  try {
    const res = await apiFetch(`/reservations/code/${code}`);
    state.activePinReservation = res.data;

    container.innerHTML = `
      <div class="promo-output-card margin-top-md">
        <div class="prod-title">Reserva: ${res.data.codigoRetiro}</div>
        <div style="font-size:0.85rem; color: var(--text-secondary); margin-top:4px;">
          Estado: <strong style="color:var(--accent-cyan);">${res.data.estado}</strong> | Expira: ${new Date(res.data.fechaExpiracion).toLocaleTimeString()}
        </div>
        <div style="margin-top:8px; font-size:0.85rem;">
          Artículos en reserva: ${res.data.detalles ? res.data.detalles.length : 0} lote(s) asignados.
        </div>
      </div>
    `;

    document.getElementById('btnConfirmPay').disabled = (res.data.estado !== 'PENDIENTE');
  } catch (err) {
    container.innerHTML = `<div style="color: var(--accent-rose); margin-top:8px;">❌ ${err.message}</div>`;
    document.getElementById('btnConfirmPay').disabled = true;
  }
}

async function confirmPayment() {
  if (!state.activePinReservation) return;

  try {
    const res = await apiFetch(`/reservations/${state.activePinReservation.id}/confirm`, 'POST');
    closeModal('confirmPinModal');
    showToast(`💰 Reserva ${state.activePinReservation.codigoRetiro} cobrada con éxito.`);
    alert('✅ Transacción en caja SIACI procesada. Stock deducido correctamente.');
    loadCatalog();
    loadLots();
  } catch (err) {
    alert(`❌ Error al confirmar cobro: ${err.message}`);
  }
}

// --- Tab 2: Control de Lotes ---
async function loadLots() {
  const tbody = document.getElementById('lotsTableBody');
  tbody.innerHTML = '<tr><td colspan="9" class="loading-state">Cargando lotes de producción...</td></tr>';

  try {
    const res = await apiFetch('/lots');
    state.lots = res.data || [];

    if (state.lots.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="loading-state">No hay lotes activos.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    state.lots.forEach(lot => {
      const expiry = new Date(lot.fechaCaducidad);
      const diffDays = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));

      let badgeHtml = '<span class="badge badge-green">NORMAL</span>';
      if (diffDays < 7) {
        badgeHtml = '<span class="badge badge-red">CRÍTICO (<7d)</span>';
      } else if (diffDays < 15) {
        badgeHtml = '<span class="badge badge-yellow">ADVERTENCIA (<15d)</span>';
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${lot.productoNombre || 'Producto'}</strong></td>
        <td><code>${lot.numeroLote}</code></td>
        <td>${expiry.toLocaleDateString()}</td>
        <td><strong>${diffDays} días</strong></td>
        <td>${badgeHtml}</td>
        <td><strong style="color:var(--accent-emerald)">${lot.cantidadDisponible}</strong></td>
        <td><strong style="color:var(--accent-amber)">${lot.cantidadReservada || 0}</strong></td>
        <td><span class="badge badge-location">${lot.ubicacion}</span></td>
        <td>
          <button class="btn btn-glass" onclick="toggleLocation('${lot.id}', '${lot.ubicacion}')" title="Mover ubicación">
            🔄 ${lot.ubicacion === 'BODEGA' ? 'A Percha' : 'A Bodega'}
          </button>
          <button class="btn btn-danger" onclick="promptMerma('${lot.id}')" style="padding: 4px 8px; font-size: 0.75rem;">
            ⚠️ Merma
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="loading-state" style="color:var(--accent-rose)">❌ ${err.message}</td></tr>`;
  }
}

async function toggleLocation(lotId, currentLoc) {
  const newLoc = currentLoc === 'BODEGA' ? 'PERCHA' : 'BODEGA';
  try {
    await apiFetch(`/lots/${lotId}/location`, 'PATCH', { ubicacion: newLoc });
    showToast(`📦 Ubicación del lote cambiada a ${newLoc}`);
    loadLots();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

async function promptMerma(lotId) {
  const qty = prompt('Ingresa la cantidad de unidades a dar de baja por merma/caducidad:');
  if (!qty) return;
  const razon = prompt('Razón de la baja:', 'Producto caducado');

  try {
    await apiFetch(`/lots/${lotId}/merma`, 'POST', { cantidad: parseInt(qty, 10), razon });
    showToast('⚠️ Merma registrada correctamente.');
    loadLots();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

function openNewLotModal() {
  const select = document.getElementById('lotProductSelect');
  select.innerHTML = state.products.map(p => `<option value="${p.id}">${p.nombre} (${p.codigoBarras})</option>`).join('');
  openModal('newLotModal');
}

async function submitNewLot(event) {
  event.preventDefault();
  const productoId = document.getElementById('lotProductSelect').value;
  const numeroLote = document.getElementById('lotNumberInput').value.trim();
  const fechaCaducidad = document.getElementById('lotExpiryInput').value;
  const cantidadIngresada = parseInt(document.getElementById('lotQtyInput').value, 10);
  const ubicacion = document.getElementById('lotLocationSelect').value;

  try {
    await apiFetch('/lots', 'POST', { productoId, numeroLote, fechaCaducidad, cantidadIngresada, ubicacion });
    closeModal('newLotModal');
    showToast('📦 Nuevo lote ingresado en inventario maestro.');
    loadLots();
    loadCatalog();
  } catch (err) {
    alert(`Error al registrar lote: ${err.message}`);
  }
}

// --- Tab 3: Gemini IA ---
function populateAiLotSelect() {
  const select = document.getElementById('aiLotSelect');
  select.innerHTML = state.lots.map(l => {
    const expiry = new Date(l.fechaCaducidad);
    const diffDays = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
    return `<option value="${l.id}">${l.productoNombre || 'Producto'} | Lote: ${l.numeroLote} (${diffDays} días p/ vencer)</option>`;
  }).join('');
}

async function handleGenerateAiPromo(event) {
  event.preventDefault();
  const loteId = document.getElementById('aiLotSelect').value;
  if (!loteId) return alert('Selecciona un lote.');

  const btn = document.getElementById('btnAiGenerate');
  const output = document.getElementById('aiOutputArea');

  btn.disabled = true;
  btn.textContent = '⏳ Consultando API de Gemini...';

  try {
    const res = await apiFetch('/promotions/generate', 'POST', { loteId });
    const promo = res.data;

    output.innerHTML = `
      <div class="promo-output-card">
        <div class="promo-badge">${promo.descuentoPorcentaje}% DESCUENTO</div>
        <div class="promo-copy">"${promo.frasePromocional}"</div>
        <div class="promo-reason"><strong>Razonamiento IA:</strong> ${promo.razonIa || 'Generado por Gemini AI'}</div>
      </div>
    `;

    showToast('✨ Promoción generada con Gemini AI!');
    loadActivePromotions();
  } catch (err) {
    output.innerHTML = `<div style="color:var(--accent-rose)">❌ Error Gemini IA: ${err.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ Generar Promoción con Gemini API';
  }
}

async function loadActivePromotions() {
  const grid = document.getElementById('promotionsGrid');
  try {
    const res = await apiFetch('/promotions');
    state.promotions = res.data || [];

    if (state.promotions.length === 0) {
      grid.innerHTML = '<div class="loading-state">No hay promociones publicadas.</div>';
      return;
    }

    grid.innerHTML = state.promotions.map(p => `
      <div class="glass-card" style="border-color: rgba(225, 0, 255, 0.3);">
        <span class="badge badge-yellow">${p.descuentoPorcentaje}% OFF</span>
        <h4 style="margin: 8px 0; font-size:1.05rem;">${p.frasePromocional}</h4>
        <div style="font-size:0.75rem; color:var(--text-muted);">Generado: ${new Date(p.created_at).toLocaleString()}</div>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<div style="color:var(--accent-rose)">Error al cargar promociones: ${err.message}</div>`;
  }
}

// --- Tab 4: Alertas ---
async function loadAlerts() {
  const container = document.getElementById('alertsList');
  try {
    const res = await apiFetch('/alerts');
    state.alerts = res.data || [];

    if (state.alerts.length === 0) {
      container.innerHTML = '<div class="loading-state" style="color:var(--accent-emerald)">✅ No hay alertas de vencimiento pendientes.</div>';
      return;
    }

    container.innerHTML = state.alerts.map(a => `
      <div class="widget-card margin-bottom-sm" style="border-color: ${a.nivel === 'ROJO' ? 'rgba(244,63,94,0.4)' : 'rgba(245,158,11,0.4)'}">
        <span class="badge ${a.nivel === 'ROJO' ? 'badge-red' : 'badge-yellow'}">${a.nivel}</span>
        <div>
          <div style="font-weight:700; font-size:0.9rem;">${a.productoNombre} (Lote: ${a.numeroLote})</div>
          <div style="font-size:0.8rem; color:var(--text-secondary);">Vence en ${a.diasParaVencer} días | Ubicación: ${a.ubicacion}</div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div style="color:var(--accent-rose)">Error: ${err.message}</div>`;
  }
}

// --- Tab 5: Settings ---
function saveApiUrl() {
  const input = document.getElementById('apiBaseUrlInput').value.trim();
  if (!input) return;
  API_BASE_URL = input;
  localStorage.setItem('karen_api_url', API_BASE_URL);
  showToast('💾 URL Base de la API guardada.');
  checkHeartbeat();
  initSseStream();
  loadCatalog();
}

// --- UI Utilities ---
function openModal(id) {
  document.getElementById(id).classList.add('show');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}
