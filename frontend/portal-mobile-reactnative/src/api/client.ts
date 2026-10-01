import axios from 'axios';
import { Platform } from 'react-native';

// In React Native:
// - Android Emulator maps host machine localhost to 10.0.2.2
// - iOS Simulator maps host machine localhost to localhost
// - Web maps to localhost
// - Physical devices can use the local network IP (default: 192.168.1.50 or localhost)
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

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 6000,
});

let inMemoryToken: string | null = null;
let inMemoryUser: any = null;

apiClient.interceptors.request.use((config) => {
  if (inMemoryToken && config.headers) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
  }
  return config;
});

export interface HeartbeatResponse {
  success: boolean;
  status: 'ONLINE' | 'OFFLINE';
  secondsSinceLastHeartbeat: number;
  reservationsBlocked: boolean;
  message: string;
}

export interface BackendCategory {
  id: string;
  nombre: string;
  descripcion?: string;
  created_at?: string;
}

export interface BackendProduct {
  id: string;
  categoriaId: string;
  codigoBarras: string;
  nombre: string;
  descripcion?: string;
  precioVenta: number;
  minStockAlerta: number;
  aliasId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BackendLot {
  id: string;
  productoId: string;
  numeroLote: string;
  fechaCaducidad: string;
  cantidadIngresada: number;
  cantidadDisponible: number;
  cantidadReservada: number;
  ubicacion: 'BODEGA' | 'PERCHA';
  estado: string;
  productoNombre?: string;
  codigoBarras?: string;
}

export interface BackendPromotion {
  id: string;
  loteId: string;
  descuentoPorcentaje: number;
  frasePromocional: string;
  razonIa?: string;
  activa: boolean;
  created_at?: string;
}

export interface CreateReservationRequest {
  usuarioId: string;
  items: {
    productoId: string;
    cantidad: number;
  }[];
}

export interface ReservationDetail {
  id?: string;
  reservaId?: string;
  loteId: string;
  cantidad: number;
  precioUnitario: number;
}

export interface BackendReservation {
  id: string;
  usuarioId: string;
  codigoRetiro: string;
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'EXPIRADA' | 'CANCELADA';
  fechaExpiracion: string;
  detalles: ReservationDetail[];
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
  token: string;
}

// Fallback helper trying secondary URLs if the primary fails
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

export const api = {
  // 1. Heartbeat
  async getHeartbeat(): Promise<HeartbeatResponse> {
    return requestWithFallback(async (url) => {
      const res = await axios.get<HeartbeatResponse>(`${url}/heartbeat`, { timeout: 3500 });
      return res.data;
    });
  },

  async pingHeartbeat(): Promise<HeartbeatResponse> {
    return requestWithFallback(async (url) => {
      const res = await axios.post<HeartbeatResponse>(`${url}/heartbeat`, {}, { timeout: 3500 });
      return res.data;
    });
  },

  // 2. Categories
  async getCategories(): Promise<BackendCategory[]> {
    return requestWithFallback(async (url) => {
      const res = await axios.get<{ success: boolean; data: BackendCategory[] }>(`${url}/categories`, { timeout: 4000 });
      return res.data.data || [];
    });
  },

  // 3. Products
  async getProducts(): Promise<BackendProduct[]> {
    return requestWithFallback(async (url) => {
      const res = await axios.get<{ success: boolean; data: BackendProduct[] }>(`${url}/products`, { timeout: 4000 });
      return res.data.data || [];
    });
  },

  // 4. Lots
  async getLots(): Promise<BackendLot[]> {
    return requestWithFallback(async (url) => {
      const res = await axios.get<{ success: boolean; data: BackendLot[] }>(`${url}/lots`, { timeout: 4000 });
      return res.data.data || [];
    });
  },

  // 5. Promotions (Gemini AI)
  async getPromotions(): Promise<BackendPromotion[]> {
    return requestWithFallback(async (url) => {
      const res = await axios.get<{ success: boolean; data: BackendPromotion[] }>(`${url}/promotions`, { timeout: 4000 });
      return res.data.data || [];
    });
  },

  async generatePromotion(loteId: string): Promise<BackendPromotion> {
    return requestWithFallback(async (url) => {
      const res = await axios.post<{ success: boolean; data: BackendPromotion }>(
        `${url}/promotions/generate`,
        { loteId },
        { timeout: 8000 }
      );
      return res.data.data;
    });
  },

  // 6. Anti-Overbooking Reservations (FEFO)
  async createReservation(payload: CreateReservationRequest): Promise<BackendReservation> {
    return requestWithFallback(async (url) => {
      const res = await axios.post<{ success: boolean; data: BackendReservation }>(
        `${url}/reservations`,
        payload,
        {
          headers: inMemoryToken ? { Authorization: `Bearer ${inMemoryToken}` } : {},
          timeout: 6000,
        }
      );
      return res.data.data;
    });
  },

  async getReservationByCode(code: string): Promise<BackendReservation> {
    return requestWithFallback(async (url) => {
      const res = await axios.get<{ success: boolean; data: BackendReservation }>(
        `${url}/reservations/code/${encodeURIComponent(code.trim().toUpperCase())}`,
        { timeout: 5000 }
      );
      return res.data.data;
    });
  },

  async cancelReservation(id: string): Promise<BackendReservation> {
    return requestWithFallback(async (url) => {
      const res = await axios.post<{ success: boolean; data: BackendReservation }>(
        `${url}/reservations/${id}/cancel`,
        {},
        {
          headers: inMemoryToken ? { Authorization: `Bearer ${inMemoryToken}` } : {},
          timeout: 5000,
        }
      );
      return res.data.data;
    });
  },

  async getUserReservations(userId: string): Promise<BackendReservation[]> {
    return requestWithFallback(async (url) => {
      const res = await axios.get<{ success: boolean; data: BackendReservation[] }>(
        `${url}/reservations/user/${userId}`,
        {
          headers: inMemoryToken ? { Authorization: `Bearer ${inMemoryToken}` } : {},
          timeout: 5000,
        }
      );
      return res.data.data || [];
    });
  },

  // 7. Authentication
  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    return requestWithFallback(async (url) => {
      const res = await axios.post<{ success: boolean; data: AuthResponse }>(
        `${url}/auth/login`,
        credentials,
        { timeout: 5000 }
      );
      if (res.data.data?.token) {
        inMemoryToken = res.data.data.token;
        inMemoryUser = res.data.data.user;
      }
      return res.data.data;
    });
  },

  async register(data: { nombre: string; email: string; password: string; rol?: string }): Promise<AuthResponse> {
    return requestWithFallback(async (url) => {
      const res = await axios.post<{ success: boolean; data: AuthResponse }>(
        `${url}/auth/register`,
        data,
        { timeout: 5000 }
      );
      if (res.data.data?.token) {
        inMemoryToken = res.data.data.token;
        inMemoryUser = res.data.data.user;
      }
      return res.data.data;
    });
  },

  logout() {
    inMemoryToken = null;
    inMemoryUser = null;
  },

  getCurrentUser() {
    return inMemoryUser;
  },

  setToken(token: string | null, user: any = null) {
    inMemoryToken = token;
    inMemoryUser = user;
  },
};
