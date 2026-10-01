import axios from 'axios';
import { Platform } from 'react-native';
import {
  BackendLot,
  BackendProduct,
  BackendCategory,
  BackendPromotion,
  BackendReservation,
  CreateLotPayload,
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
  secondsSinceLastHeartbeat: number;
  reservationsBlocked: boolean;
  message: string;
}

export const api = {
  // 1. Heartbeat Red Local
  async getHeartbeat(): Promise<HeartbeatStatus> {
    return requestWithFallback(async (url) => {
      const res = await axios.get<HeartbeatStatus>(`${url}/heartbeat`, { timeout: 3500 });
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
      const res = await axios.get<{ success: boolean; data: BackendLot[] }>(`${url}/lots`, { timeout: 5000 });
      return res.data.data || [];
    });
  },

  async createLot(payload: CreateLotPayload): Promise<BackendLot> {
    return requestWithFallback(async (url) => {
      const res = await axios.post<{ success: boolean; data: BackendLot }>(
        `${url}/lots`,
        payload,
        { timeout: 6000 }
      );
      return res.data.data;
    });
  },

  async updateLotLocation(lotId: string, location: 'BODEGA' | 'PERCHA'): Promise<BackendLot> {
    return requestWithFallback(async (url) => {
      const res = await axios.patch<{ success: boolean; data: BackendLot }>(
        `${url}/lots/${lotId}/location`,
        { ubicacion: location },
        { timeout: 5000 }
      );
      return res.data.data;
    });
  },

  async registerMerma(lotId: string, cantidad: number, razon: string): Promise<BackendLot> {
    return requestWithFallback(async (url) => {
      const res = await axios.post<{ success: boolean; data: BackendLot }>(
        `${url}/lots/${lotId}/merma`,
        { cantidad, razon },
        { timeout: 5000 }
      );
      return res.data.data;
    });
  },

  // 4. Alertas de Caducidad FEFO
  async getAlerts(): Promise<ExpiryAlertItem[]> {
    return requestWithFallback(async (url) => {
      const res = await axios.get<{ success: boolean; data: ExpiryAlertItem[] }>(`${url}/alerts`, { timeout: 5000 });
      return res.data.data || [];
    });
  },

  // 5. Asistente IA Gemini (Promoción para lote cercano a vencer)
  async generatePromotion(loteId: string): Promise<BackendPromotion> {
    return requestWithFallback(async (url) => {
      const res = await axios.post<{ success: boolean; data: BackendPromotion }>(
        `${url}/promotions/generate`,
        { loteId },
        { timeout: 9000 }
      );
      return res.data.data;
    });
  },

  // 6. Validación de Caja SIACI
  async getReservationByCode(code: string): Promise<BackendReservation> {
    return requestWithFallback(async (url) => {
      const res = await axios.get<{ success: boolean; data: BackendReservation }>(
        `${url}/reservations/code/${encodeURIComponent(code.trim().toUpperCase())}`,
        { timeout: 5000 }
      );
      return res.data.data;
    });
  },

  async confirmReservation(reservationId: string): Promise<BackendReservation> {
    return requestWithFallback(async (url) => {
      const res = await axios.post<{ success: boolean; data: BackendReservation }>(
        `${url}/reservations/${reservationId}/confirm`,
        {},
        { timeout: 6000 }
      );
      return res.data.data;
    });
  },
};
