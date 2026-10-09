import axios from 'axios';
import { Platform } from 'react-native';

const getBaseUrl = (): string => {
  const configuredUrl = (globalThis as any)?.process?.env?.EXPO_PUBLIC_API_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000/api/v1';
  }
  return 'http://localhost:4000/api/v1';
};

export const BASE_URL = getBaseUrl();

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

export const api = {
  // 1. Heartbeat
  async getHeartbeat(): Promise<HeartbeatResponse> {
    const res = await apiClient.get<HeartbeatResponse>('/heartbeat', { timeout: 3500 });
    return res.data;
  },

  async pingHeartbeat(): Promise<HeartbeatResponse> {
    const res = await apiClient.post<HeartbeatResponse>('/heartbeat', {}, { timeout: 3500 });
    return res.data;
  },

  // 2. Categories
  async getCategories(): Promise<BackendCategory[]> {
    const res = await apiClient.get<{ success: boolean; data: BackendCategory[] }>('/categories');
    return res.data.data || [];
  },

  // 3. Products
  async getProducts(): Promise<BackendProduct[]> {
    const res = await apiClient.get<{ success: boolean; data: BackendProduct[] }>('/products');
    return res.data.data || [];
  },

  // 4. Lots
  async getLots(): Promise<BackendLot[]> {
    const res = await apiClient.get<{ success: boolean; data: BackendLot[] }>('/availability');
    return res.data.data || [];
  },

  // 5. Promotions (Gemini AI)
  async getPromotions(): Promise<BackendPromotion[]> {
    const res = await apiClient.get<{ success: boolean; data: BackendPromotion[] }>('/promotions');
    return res.data.data || [];
  },

  // 6. Anti-Overbooking Reservations (FEFO)
  async createReservation(payload: CreateReservationRequest): Promise<BackendReservation> {
    const res = await apiClient.post<{ success: boolean; data: BackendReservation }>('/reservations', payload);
    return res.data.data;
  },

  async getReservationByCode(code: string): Promise<BackendReservation> {
    const res = await apiClient.get<{ success: boolean; data: BackendReservation }>(
      `/reservations/code/${encodeURIComponent(code.trim().toUpperCase())}`
    );
    return res.data.data;
  },

  async cancelReservation(id: string): Promise<BackendReservation> {
    const res = await apiClient.post<{ success: boolean; data: BackendReservation }>(`/reservations/${id}/cancel`);
    return res.data.data;
  },

  async getUserReservations(userId: string): Promise<BackendReservation[]> {
    const res = await apiClient.get<{ success: boolean; data: BackendReservation[] }>(`/reservations/user/${userId}`);
    return res.data.data || [];
  },

  // 7. Authentication
  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const res = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/login', credentials);
    if (res.data.data?.token) {
      inMemoryToken = res.data.data.token;
      inMemoryUser = res.data.data.user;
    }
    return res.data.data;
  },

  async register(data: { nombre: string; email: string; password: string; rol?: string }): Promise<AuthResponse> {
    const res = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/register', data);
    if (res.data.data?.token) {
      inMemoryToken = res.data.data.token;
      inMemoryUser = res.data.data.user;
    }
    return res.data.data;
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
