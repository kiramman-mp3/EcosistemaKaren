import axios from 'axios';
import { Platform } from 'react-native';
import EventSource from 'react-native-sse';
import { clearSession, loadSession, saveSession, StoredStaffUser } from '../auth/secureSession';
import {
  BackendLot,
  BackendProduct,
  BackendCategory,
  BackendPromotion,
  BackendReservation,
  CreateLotPayload,
  WasteAuditResult,
  ExpiryAlertItem,
  InventoryMovement,
  InventoryWaste,
} from '../types';

const getBaseUrl = (): string => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000/api/v1';
  }
  return 'http://localhost:4000/api/v1';
};

export const BASE_URL = getBaseUrl();

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
        `${BASE_URL}/auth/login`,
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
      const res = await axios.get<HeartbeatStatus>(`${BASE_URL}/heartbeat`, { timeout: 3500 });
      return res.data;
  },

  async sendHeartbeat(): Promise<HeartbeatStatus> {
    const res = await axios.post<HeartbeatStatus>(
      `${BASE_URL}/heartbeat`, {}, authorizedConfig(3500)
    );
    return res.data;
  },

  // 2. Catálogo de Productos
  async getProducts(): Promise<BackendProduct[]> {
      const res = await axios.get<{ success: boolean; data: BackendProduct[] }>(`${BASE_URL}/products`, { timeout: 4000 });
      return res.data.data || [];
  },

  async getProductByBarcode(barcode: string): Promise<BackendProduct | null> {
      const res = await axios.get<{ success: boolean; data: BackendProduct }>(
        `${BASE_URL}/products/barcode/${encodeURIComponent(barcode.trim())}`,
        { timeout: 4000 }
      );
      return res.data.data || null;
  },

  async getCategories(): Promise<BackendCategory[]> {
      const res = await axios.get<{ success: boolean; data: BackendCategory[] }>(`${BASE_URL}/categories`, { timeout: 4000 });
      return res.data.data || [];
  },

  // 3. Gestión de Lotes (Bodega e Inventario)
  async getLots(): Promise<BackendLot[]> {
      const res = await axios.get<{ success: boolean; data: BackendLot[] }>(`${BASE_URL}/lots`, authorizedConfig(5000));
      return res.data.data || [];
  },

  async createLot(payload: CreateLotPayload): Promise<BackendLot> {
    const res = await axios.post<{ success: boolean; data: BackendLot }>(
      `${BASE_URL}/lots`, payload, authorizedConfig(6000)
    );
    return res.data.data;
  },

  async updateLotLocation(lotId: string, location: 'BODEGA' | 'PERCHA'): Promise<BackendLot> {
    const res = await axios.patch<{ success: boolean; data: BackendLot }>(
      `${BASE_URL}/lots/${lotId}/location`, { ubicacion: location }, authorizedConfig(5000)
    );
    return res.data.data;
  },

  async registerMerma(lotId: string, cantidad: number, razon: string): Promise<WasteAuditResult> {
    const res = await axios.post<{ success: boolean; data: WasteAuditResult }>(
      `${BASE_URL}/lots/${lotId}/merma`, { cantidad, razon }, authorizedConfig(5000)
    );
    return res.data.data;
  },

  // 4. Alertas de Caducidad FEFO
  async getAlerts(): Promise<ExpiryAlertItem[]> {
      const res = await axios.get<{ success: boolean; data: ExpiryAlertItem[] }>(`${BASE_URL}/alerts`, authorizedConfig(5000));
      return res.data.data || [];
  },

  subscribeAlerts(onAlert: (event: unknown) => void, onConnectionChange: (connected: boolean) => void) {
    if (!authToken) throw new Error('Se requiere una sesión activa para abrir el canal SSE.');
    const source = new EventSource(`${BASE_URL}/alerts/stream`, {
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
      `${BASE_URL}/inventory/movements`, { ...authorizedConfig(7000), params: { limit } }
    );
    return res.data.data || [];
  },

  async getInventoryWastes(limit = 200): Promise<InventoryWaste[]> {
    const res = await axios.get<{ success: boolean; data: InventoryWaste[] }>(
      `${BASE_URL}/inventory/wastes`, { ...authorizedConfig(7000), params: { limit } }
    );
    return res.data.data || [];
  },

  // 5. Asistente IA Gemini (Promoción para lote cercano a vencer)
  async generatePromotion(loteId: string): Promise<BackendPromotion> {
    const res = await axios.post<{ success: boolean; data: BackendPromotion }>(
      `${BASE_URL}/promotions/generate`,
      { loteId },
      authorizedConfig(12000)
    );
    return res.data.data;
  },

  async getPendingPromotions(): Promise<BackendPromotion[]> {
    const res = await axios.get<{ success: boolean; data: BackendPromotion[] }>(
      `${BASE_URL}/promotions/pending`, authorizedConfig(7000)
    );
    return res.data.data || [];
  },

  async approvePromotion(id: string): Promise<BackendPromotion> {
    const res = await axios.post<{ success: boolean; data: BackendPromotion }>(
      `${BASE_URL}/promotions/${id}/approve`, {}, authorizedConfig(7000)
    );
    return res.data.data;
  },

  async rejectPromotion(id: string, motivoRechazo: string): Promise<BackendPromotion> {
    const res = await axios.post<{ success: boolean; data: BackendPromotion }>(
      `${BASE_URL}/promotions/${id}/reject`, { motivoRechazo }, authorizedConfig(7000)
    );
    return res.data.data;
  },

  // 6. Validación de Caja SIACI
  async getReservationByCode(code: string): Promise<BackendReservation> {
      const res = await axios.get<{ success: boolean; data: BackendReservation }>(
        `${BASE_URL}/reservations/code/${encodeURIComponent(code.trim().toUpperCase())}`,
        authorizedConfig(5000)
      );
      return res.data.data;
  },

  async confirmReservation(reservationId: string): Promise<BackendReservation> {
    const res = await axios.post<{ success: boolean; data: BackendReservation }>(
      `${BASE_URL}/reservations/${reservationId}/confirm`, {}, authorizedConfig(6000)
    );
    return res.data.data;
  },
};
