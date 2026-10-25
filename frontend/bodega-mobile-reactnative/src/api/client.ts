import axios from 'axios';
import EventSource from 'react-native-sse';
import { getServerUrl } from './serverConfig';
import { clearSession, loadSession, saveSession, StoredStaffUser } from '../auth/secureSession';
import {
  BackendLot,
  BackendProduct,
  ProductImageInfo,
  BackendCategory,
  CreateProductPayload,
  BackendPromotion,
  BackendReservation,
  CreateLotPayload,
  WasteAuditResult,
  ExpiryAlertItem,
  InventoryMovement,
  InventorySummary,
  InventoryWaste,
  PriceChange,
  SummaryPeriod,
} from '../types';


/** Las imágenes llegan como rutas del backend (/api/v1/media/...); la app nativa necesita la URL completa. */
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return getServerUrl().replace(/\/api\/v1$/, '') + path;
}

let authToken: string | null = null;
let sessionExpiredListener: (() => void) | null = null;

axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      authToken = null;
      await clearSession();
      sessionExpiredListener?.();
    }
    return Promise.reject(error);
  }
);

const authorizedConfig = (timeout: number) => ({
  timeout,
  headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
});

export interface BodegaAuthResponse {
  user: { id: string; nombre: string; email: string; rol: string };
  token: string;
}

export interface HeartbeatStatus {
  success: boolean;
  status: 'ONLINE' | 'OFFLINE';
  lastHeartbeatAt?: string | null;
  secondsSinceLastHeartbeat: number | null;
  timeoutSeconds?: number;
  reservationsBlocked: boolean;
  message: string;
}

export const api = {
  async login(email: string, password: string): Promise<BodegaAuthResponse> {
      const res = await axios.post<{ success: boolean; data: BodegaAuthResponse }>(
        `${getServerUrl()}/auth/login`,
        { email, password },
        { timeout: 5000 }
      );
      const result = res.data.data;
      if (!['BODEGUERO', 'PERCHERO', 'ADMIN'].includes(result.user.rol)) {
        throw new Error('Esta aplicación requiere un usuario operativo de bodega.');
      }
      authToken = result.token;
      await saveSession(result.token, result.user);
      return result;
  },

  async logout() {
    authToken = null;
    await clearSession();
  },

  async restoreSession(): Promise<StoredStaffUser | null> {
    const session = await loadSession();
    if (!session || !['BODEGUERO', 'PERCHERO', 'ADMIN'].includes(session.user.rol)) {
      authToken = null;
      if (session) await clearSession();
      return null;
    }
    authToken = session.token;
    return session.user;
  },

  onSessionExpired(listener: (() => void) | null) {
    sessionExpiredListener = listener;
    return () => { if (sessionExpiredListener === listener) sessionExpiredListener = null; };
  },

  // 1. Heartbeat Red Local
  async getHeartbeat(): Promise<HeartbeatStatus> {
      const res = await axios.get<HeartbeatStatus>(`${getServerUrl()}/heartbeat`, { timeout: 3500 });
      return res.data;
  },

  // 2. Catálogo de Productos
  // El backend pagina de a 100: se recorren las páginas para tener el catálogo completo.
  async getProducts(): Promise<BackendProduct[]> {
    const pageSize = 100;
    const all: BackendProduct[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const page = await this.getProductsPage({ limit: pageSize, offset });
      all.push(...page.items);
      if (page.items.length < pageSize || all.length >= page.total) return all;
    }
  },

  async getProductsPage(params: { q?: string; categoriaId?: string; limit?: number; offset?: number }): Promise<{ items: BackendProduct[]; total: number }> {
    const res = await axios.get<{ success: boolean; data: BackendProduct[]; total: number }>(`${getServerUrl()}/products`, {
      params, timeout: 5000
    });
    return { items: res.data.data || [], total: Number(res.data.total || 0) };
  },

  async getProductByBarcode(barcode: string): Promise<BackendProduct | null> {
      const res = await axios.get<{ success: boolean; data: BackendProduct }>(
        `${getServerUrl()}/products/barcode/${encodeURIComponent(barcode.trim())}`,
        { timeout: 4000 }
      );
      return res.data.data || null;
  },

  async getCategories(): Promise<BackendCategory[]> {
      const res = await axios.get<{ success: boolean; data: BackendCategory[] }>(`${getServerUrl()}/categories`, { timeout: 4000 });
      return res.data.data || [];
  },

  async createCategory(payload: { nombre: string; descripcion?: string }): Promise<BackendCategory> {
    const res = await axios.post<{ success: boolean; data: BackendCategory }>(
      `${getServerUrl()}/categories`, payload, authorizedConfig(5000)
    );
    return res.data.data;
  },

  async createProduct(payload: CreateProductPayload): Promise<BackendProduct> {
    const res = await axios.post<{ success: boolean; data: BackendProduct }>(
      `${getServerUrl()}/products`, payload, authorizedConfig(6000)
    );
    return res.data.data;
  },

  /**
   * Sube la foto de un producto (archivo local, ya reducido en el teléfono). El servidor la vuelve a comprimir
   * y la sincroniza con el portal. Se usa fetch y no axios porque el cuerpo es un archivo binario.
   */
  async uploadProductImage(productId: string, fileUri: string): Promise<{ product: BackendProduct; image: ProductImageInfo }> {
    const photo = await (await fetch(fileUri)).blob();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(`${getServerUrl()}/products/${encodeURIComponent(productId)}/image`, {
        method: 'PUT',
        headers: { 'Content-Type': photo.type || 'image/jpeg', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: photo,
        signal: controller.signal,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          authToken = null;
          await clearSession();
          sessionExpiredListener?.();
        }
        // Misma forma que un error de axios, para que getServerMessage/getErrorStatus lo entiendan.
        throw Object.assign(new Error(body.message || 'No se pudo subir la foto.'), { response: { status: response.status, data: body } });
      }
      return { product: body.data, image: body.image };
    } finally {
      clearTimeout(timer);
    }
  },

  // 3. Gestión de Lotes (Bodega e Inventario)
  async getLots(): Promise<BackendLot[]> {
      const res = await axios.get<{ success: boolean; data: BackendLot[] }>(`${getServerUrl()}/lots`, authorizedConfig(5000));
      return res.data.data || [];
  },

  async createLot(payload: CreateLotPayload): Promise<BackendLot & { cambioPrecio: PriceChange | null }> {
    const res = await axios.post<{ success: boolean; data: BackendLot; cambioPrecio?: PriceChange | null }>(
      `${getServerUrl()}/lots`, payload, authorizedConfig(6000)
    );
    return { ...res.data.data, cambioPrecio: res.data.cambioPrecio ?? null };
  },

  async updateLotLocation(lotId: string, location: 'BODEGA' | 'PERCHA'): Promise<BackendLot> {
    const res = await axios.patch<{ success: boolean; data: BackendLot }>(
      `${getServerUrl()}/lots/${lotId}/location`, { ubicacion: location }, authorizedConfig(5000)
    );
    return res.data.data;
  },

  async registerMerma(lotId: string, cantidad: number, razon: string): Promise<WasteAuditResult> {
    const res = await axios.post<{ success: boolean; data: WasteAuditResult }>(
      `${getServerUrl()}/lots/${lotId}/merma`, { cantidad, razon }, authorizedConfig(5000)
    );
    return res.data.data;
  },

  // 4. Alertas de Caducidad FEFO
  async getAlerts(): Promise<ExpiryAlertItem[]> {
      const res = await axios.get<{ success: boolean; data: ExpiryAlertItem[] }>(`${getServerUrl()}/alerts`, authorizedConfig(5000));
      return res.data.data || [];
  },

  subscribeAlerts(onAlert: (event: unknown) => void, onConnectionChange: (connected: boolean) => void) {
    if (!authToken) throw new Error('Se requiere una sesión activa para abrir el canal SSE.');
    const source = new EventSource(`${getServerUrl()}/alerts/stream`, {
      headers: { Authorization: `Bearer ${authToken}` },
      pollingInterval: 5000,
    });
    source.addEventListener('open', () => onConnectionChange(true));
    source.addEventListener('message', (event) => {
      if (!event.data) return;
      try { onAlert(JSON.parse(event.data)); } catch { /* heartbeat o mensaje inválido */ }
    });
    source.addEventListener('error', () => onConnectionChange(false));
    return () => source.close();
  },

  async getInventoryMovements(limit = 200): Promise<InventoryMovement[]> {
    const res = await axios.get<{ success: boolean; data: InventoryMovement[] }>(
      `${getServerUrl()}/inventory/movements`, { ...authorizedConfig(7000), params: { limit } }
    );
    return res.data.data || [];
  },

  async getInventorySummary(periodo: SummaryPeriod): Promise<InventorySummary> {
    const res = await axios.get<{ success: boolean; data: InventorySummary }>(
      `${getServerUrl()}/inventory/summary`, { ...authorizedConfig(7000), params: { periodo } }
    );
    return res.data.data;
  },

  async getInventoryWastes(limit = 200): Promise<InventoryWaste[]> {
    const res = await axios.get<{ success: boolean; data: InventoryWaste[] }>(
      `${getServerUrl()}/inventory/wastes`, { ...authorizedConfig(7000), params: { limit } }
    );
    return res.data.data || [];
  },

  // 5. Asistente IA Gemini (Promoción para lote cercano a vencer)
  async generatePromotion(loteId: string): Promise<BackendPromotion> {
    const res = await axios.post<{ success: boolean; data: BackendPromotion }>(
      `${getServerUrl()}/promotions/generate`,
      { loteId },
      authorizedConfig(12000)
    );
    return res.data.data;
  },

  async getPendingPromotions(): Promise<BackendPromotion[]> {
    const res = await axios.get<{ success: boolean; data: BackendPromotion[] }>(
      `${getServerUrl()}/promotions/pending`, authorizedConfig(7000)
    );
    return res.data.data || [];
  },

  async getManagedPromotions(params: { estado?: string; activa?: boolean } = {}): Promise<BackendPromotion[]> {
    const res = await axios.get<{ success: boolean; data: BackendPromotion[] }>(
      `${getServerUrl()}/promotions/manage`, { ...authorizedConfig(7000), params }
    );
    return res.data.data || [];
  },

  async updatePromotion(id: string, payload: { descuentoPorcentaje: number; frasePromocional: string }): Promise<BackendPromotion> {
    const res = await axios.patch<{ success: boolean; data: BackendPromotion }>(
      `${getServerUrl()}/promotions/${id}`, payload, authorizedConfig(7000)
    );
    return res.data.data;
  },

  async deactivatePromotion(id: string): Promise<BackendPromotion> {
    const res = await axios.post<{ success: boolean; data: BackendPromotion }>(
      `${getServerUrl()}/promotions/${id}/deactivate`, {}, authorizedConfig(7000)
    );
    return res.data.data;
  },

  async deletePromotionDraft(id: string): Promise<void> {
    await axios.delete(`${getServerUrl()}/promotions/${id}`, authorizedConfig(7000));
  },

  async approvePromotion(id: string): Promise<BackendPromotion> {
    const res = await axios.post<{ success: boolean; data: BackendPromotion }>(
      `${getServerUrl()}/promotions/${id}/approve`, {}, authorizedConfig(7000)
    );
    return res.data.data;
  },

  async rejectPromotion(id: string, motivoRechazo: string): Promise<BackendPromotion> {
    const res = await axios.post<{ success: boolean; data: BackendPromotion }>(
      `${getServerUrl()}/promotions/${id}/reject`, { motivoRechazo }, authorizedConfig(7000)
    );
    return res.data.data;
  },

  // 6. Validación de Caja SIACI
  async getReservationByCode(code: string): Promise<BackendReservation> {
      const res = await axios.get<{ success: boolean; data: BackendReservation }>(
        `${getServerUrl()}/reservations/code/${encodeURIComponent(code.trim().toUpperCase())}`,
        authorizedConfig(5000)
      );
      return res.data.data;
  },

  async confirmReservation(reservationId: string): Promise<BackendReservation> {
    const res = await axios.post<{ success: boolean; data: BackendReservation }>(
      `${getServerUrl()}/reservations/${reservationId}/confirm`, {}, authorizedConfig(6000)
    );
    return res.data.data;
  },
};
