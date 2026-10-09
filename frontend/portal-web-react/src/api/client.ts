import axios from 'axios';

// The deployment must provide VITE_API_URL when /api/v1 is not reverse-proxied.
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
  estado?: 'PENDIENTE_APROBACION' | 'APROBADA' | 'RECHAZADA';
  cacheHit?: boolean;
  motivoRechazo?: string;
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
    const res = await apiClient.get<HeartbeatResponse>('/heartbeat');
    return res.data;
  },

  async pingHeartbeat(): Promise<HeartbeatResponse> {
    const res = await apiClient.post<HeartbeatResponse>('/heartbeat');
    return res.data;
  },

  // Categories
  async getCategories(): Promise<BackendCategory[]> {
    const res = await apiClient.get<{ success: boolean; data: BackendCategory[] }>('/categories');
    return res.data.data || [];
  },

  // Products
  async getProducts(): Promise<BackendProduct[]> {
    const res = await apiClient.get<{ success: boolean; data: BackendProduct[] }>('/products');
    return res.data.data || [];
  },

  // Lots & Stock
  async getLots(): Promise<BackendLot[]> {
    const res = await apiClient.get<{ success: boolean; data: BackendLot[] }>('/availability');
    return res.data.data || [];
  },

  // Gemini AI Promotions
  async getPromotions(): Promise<BackendPromotion[]> {
    const res = await apiClient.get<{ success: boolean; data: BackendPromotion[] }>('/promotions');
    return res.data.data || [];
  },

  async generatePromotion(loteId: string): Promise<BackendPromotion> {
    try {
      const res = await apiClient.post<{ success: boolean; data: BackendPromotion }>('/promotions/generate', { loteId });
      return res.data.data;
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 504) throw new Error('Tiempo de espera agotado al consultar la IA (Timeout 10s).');
      if (status === 429) throw new Error('Límite de solicitudes de IA alcanzado. Espere un momento.');
      if (status === 502) throw new Error('La IA devolvió una respuesta no válida. Intente nuevamente.');
      if (status === 503) throw new Error('El servicio de Gemini no está configurado o disponible.');
      if (err.response?.data?.message) throw new Error(err.response.data.message);
      throw new Error('No se pudo confirmar el resultado de la generación. No se reintentó para evitar duplicados.');
    }
  },

  async getPendingPromotions(): Promise<BackendPromotion[]> {
    const res = await apiClient.get<{ success: boolean; data: BackendPromotion[] }>('/promotions/pending');
    return res.data.data || [];
  },

  async approvePromotion(id: string): Promise<BackendPromotion> {
    const res = await apiClient.post<{ success: boolean; data: BackendPromotion }>(`/promotions/${id}/approve`);
    return res.data.data;
  },

  async rejectPromotion(id: string, motivoRechazo: string): Promise<BackendPromotion> {
    const res = await apiClient.post<{ success: boolean; data: BackendPromotion }>(`/promotions/${id}/reject`, { motivoRechazo });
    return res.data.data;
  },

  async getAiMetrics(): Promise<any> {
    const res = await apiClient.get<{ success: boolean; data: any }>('/metrics/ai');
    return res.data.data;
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
      throw new Error('No se pudo conectar con el servidor para crear la reserva.');
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
      throw new Error('No se pudo conectar con el servidor para consultar la reserva.');
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
      throw new Error('No se pudo conectar con el servidor para iniciar sesión.');
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
      throw new Error('No se pudo conectar con el servidor para crear la cuenta.');
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
