import axios from 'axios';

// Detect environment or fallback to localhost:4000
const BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

// Attach authorization token if present in localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('karen_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
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

// ============================================================================
// API METHODS
// ============================================================================

export const api = {
  // Heartbeat & System Status
  async getHeartbeat(): Promise<HeartbeatResponse> {
    try {
      const res = await apiClient.get<HeartbeatResponse>('/heartbeat');
      return res.data;
    } catch {
      // Direct fallback if relative proxy fails
      const directRes = await axios.get<HeartbeatResponse>('http://localhost:4000/api/v1/heartbeat');
      return directRes.data;
    }
  },

  async pingHeartbeat(): Promise<HeartbeatResponse> {
    try {
      const res = await apiClient.post<HeartbeatResponse>('/heartbeat');
      return res.data;
    } catch {
      const directRes = await axios.post<HeartbeatResponse>('http://localhost:4000/api/v1/heartbeat');
      return directRes.data;
    }
  },

  // Categories
  async getCategories(): Promise<BackendCategory[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: BackendCategory[] }>('/categories');
      return res.data.data || [];
    } catch {
      const directRes = await axios.get<{ success: boolean; data: BackendCategory[] }>('http://localhost:4000/api/v1/categories');
      return directRes.data.data || [];
    }
  },

  // Products
  async getProducts(): Promise<BackendProduct[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: BackendProduct[] }>('/products');
      return res.data.data || [];
    } catch {
      const directRes = await axios.get<{ success: boolean; data: BackendProduct[] }>('http://localhost:4000/api/v1/products');
      return directRes.data.data || [];
    }
  },

  // Lots & Stock
  async getLots(): Promise<BackendLot[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: BackendLot[] }>('/lots');
      return res.data.data || [];
    } catch {
      const directRes = await axios.get<{ success: boolean; data: BackendLot[] }>('http://localhost:4000/api/v1/lots');
      return directRes.data.data || [];
    }
  },

  // Gemini AI Promotions
  async getPromotions(): Promise<BackendPromotion[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: BackendPromotion[] }>('/promotions');
      return res.data.data || [];
    } catch {
      const directRes = await axios.get<{ success: boolean; data: BackendPromotion[] }>('http://localhost:4000/api/v1/promotions');
      return directRes.data.data || [];
    }
  },

  async generatePromotion(loteId: string): Promise<BackendPromotion> {
    try {
      const res = await apiClient.post<{ success: boolean; data: BackendPromotion }>('/promotions/generate', { loteId });
      return res.data.data;
    } catch {
      const directRes = await axios.post<{ success: boolean; data: BackendPromotion }>('http://localhost:4000/api/v1/promotions/generate', { loteId });
      return directRes.data.data;
    }
  },

  // Anti-Overbooking Reservations (FEFO)
  async createReservation(payload: CreateReservationRequest): Promise<BackendReservation> {
    try {
      const res = await apiClient.post<{ success: boolean; data: BackendReservation }>('/reservations', payload);
      return res.data.data;
    } catch (err: any) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      // Try direct fallback
      const directRes = await axios.post<{ success: boolean; data: BackendReservation }>('http://localhost:4000/api/v1/reservations', payload);
      return directRes.data.data;
    }
  },

  async getReservationByCode(code: string): Promise<BackendReservation> {
    try {
      const res = await apiClient.get<{ success: boolean; data: BackendReservation }>(`/reservations/code/${encodeURIComponent(code.trim())}`);
      return res.data.data;
    } catch (err: any) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      const directRes = await axios.get<{ success: boolean; data: BackendReservation }>(`http://localhost:4000/api/v1/reservations/code/${encodeURIComponent(code.trim())}`);
      return directRes.data.data;
    }
  },

  // Authentication
  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    try {
      const res = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/login', credentials);
      if (res.data.data.token) {
        localStorage.setItem('karen_token', res.data.data.token);
        localStorage.setItem('karen_user', JSON.stringify(res.data.data.user));
      }
      return res.data.data;
    } catch (err: any) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      const directRes = await axios.post<{ success: boolean; data: AuthResponse }>('http://localhost:4000/api/v1/auth/login', credentials);
      if (directRes.data.data.token) {
        localStorage.setItem('karen_token', directRes.data.data.token);
        localStorage.setItem('karen_user', JSON.stringify(directRes.data.data.user));
      }
      return directRes.data.data;
    }
  },

  async register(data: { nombre: string; email: string; password: string; rol?: string }): Promise<AuthResponse> {
    try {
      const res = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/register', data);
      if (res.data.data.token) {
        localStorage.setItem('karen_token', res.data.data.token);
        localStorage.setItem('karen_user', JSON.stringify(res.data.data.user));
      }
      return res.data.data;
    } catch (err: any) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      const directRes = await axios.post<{ success: boolean; data: AuthResponse }>('http://localhost:4000/api/v1/auth/register', data);
      if (directRes.data.data.token) {
        localStorage.setItem('karen_token', directRes.data.data.token);
        localStorage.setItem('karen_user', JSON.stringify(directRes.data.data.user));
      }
      return directRes.data.data;
    }
  },

  logout() {
    localStorage.removeItem('karen_token');
    localStorage.removeItem('karen_user');
  },

  getCurrentUser(): { id: string; nombre: string; email: string; rol: string } | null {
    const raw = localStorage.getItem('karen_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
};
