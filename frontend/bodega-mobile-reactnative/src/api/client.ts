import axios from 'axios';
import { Platform } from 'react-native';
import {
  BackendLot,
  BackendProduct,
  BackendCategory,
  BackendPromotion,
  BackendReservation,
  CreateLotPayload,
  WasteAuditResult,
  ExpiryAlertItem,
} from '../types';

const getBaseUrl = (): string => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000/api/v1';
  }
  return 'http://localhost:4000/api/v1';
};

export const BASE_URL = getBaseUrl();
const FALLBACK_URLS = [
  'http://localhost:4000/api/v1',
  'http://10.0.2.2:4000/api/v1',
  'http://192.168.1.50:4000/api/v1',
];

let authToken: string | null = null;

const authorizedConfig = (timeout: number) => ({
  timeout,
  headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
});

export interface BodegaAuthResponse {
  user: { id: string; nombre: string; email: string; rol: string };
  token: string;
}

async function requestWithFallback<T>(fn: (url: string) => Promise<T>): Promise<T> {
  const urls = [BASE_URL, ...FALLBACK_URLS.filter((u) => u !== BASE_URL)];
  let lastError: any = null;

  for (const url of urls) {
    try {
      return await fn(url);
    } catch (err: any) {
      lastError = err;
    }
  }
  throw lastError;
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
    return requestWithFallback(async (url) => {
      const res = await axios.post<{ success: boolean; data: BodegaAuthResponse }>(
        `${url}/auth/login`,
        { email, password },
        { timeout: 5000 }
      );
      const result = res.data.data;
      if (!['BODEGUERO', 'PERCHERO', 'ADMIN'].includes(result.user.rol)) {
        throw new Error('Esta aplicación requiere un usuario operativo de bodega.');
      }
      authToken = result.token;
      return result;
    });
  },

  logout() {
    authToken = null;
  },

  // 1. Heartbeat Red Local
  async getHeartbeat(): Promise<HeartbeatStatus> {
    return requestWithFallback(async (url) => {
      const res = await axios.get<HeartbeatStatus>(`${url}/heartbeat`, { timeout: 3500 });
      return res.data;
    });
  },

  async sendHeartbeat(): Promise<HeartbeatStatus> {
    return requestWithFallback(async (url) => {
      const res = await axios.post<HeartbeatStatus>(
        `${url}/heartbeat`,
        {},
        authorizedConfig(3500)
      );
      return res.data;
    });
  },

  // 2. Catálogo de Productos
  async getProducts(): Promise<BackendProduct[]> {
    return requestWithFallback(async (url) => {
      const res = await axios.get<{ success: boolean; data: BackendProduct[] }>(`${url}/products`, { timeout: 4000 });
      return res.data.data || [];
    });
  },

  async getProductByBarcode(barcode: string): Promise<BackendProduct | null> {
    return requestWithFallback(async (url) => {
      const res = await axios.get<{ success: boolean; data: BackendProduct }>(
        `${url}/products/barcode/${encodeURIComponent(barcode.trim())}`,
        { timeout: 4000 }
      );
      return res.data.data || null;
    });
  },

  async getCategories(): Promise<BackendCategory[]> {
    return requestWithFallback(async (url) => {
      const res = await axios.get<{ success: boolean; data: BackendCategory[] }>(`${url}/categories`, { timeout: 4000 });
      return res.data.data || [];
    });
  },

  // 3. Gestión de Lotes (Bodega e Inventario)
  async getLots(): Promise<BackendLot[]> {
    return requestWithFallback(async (url) => {
      const res = await axios.get<{ success: boolean; data: BackendLot[] }>(`${url}/lots`, authorizedConfig(5000));
      return res.data.data || [];
    });
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
    return requestWithFallback(async (url) => {
      const res = await axios.get<{ success: boolean; data: ExpiryAlertItem[] }>(`${url}/alerts`, authorizedConfig(5000));
      return res.data.data || [];
    });
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

  // 6. Validación de Caja SIACI
  async getReservationByCode(code: string): Promise<BackendReservation> {
    return requestWithFallback(async (url) => {
      const res = await axios.get<{ success: boolean; data: BackendReservation }>(
        `${url}/reservations/code/${encodeURIComponent(code.trim().toUpperCase())}`,
        authorizedConfig(5000)
      );
      return res.data.data;
    });
  },

  async confirmReservation(reservationId: string): Promise<BackendReservation> {
    const res = await axios.post<{ success: boolean; data: BackendReservation }>(
      `${BASE_URL}/reservations/${reservationId}/confirm`, {}, authorizedConfig(6000)
    );
    return res.data.data;
  },
};
