import axios from 'axios';
import { getServerMessage } from '../utils/errors';

// The deployment must provide VITE_API_URL when /api/v1 is not reverse-proxied.
const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Session-Mode': 'cookie',
  },
  timeout: 8000,
  withCredentials: true,
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('karen:session-expired'));
    }
    return Promise.reject(error);
  }
);

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
  imagenUrl?: string | null;
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
  ttlMinutos?: number;
  items: {
    productoId: string;
    cantidad: number;
    promocionId?: string;
  }[];
}

export interface ReservationDetail {
  id?: string;
  reservaId?: string;
  loteId: string;
  cantidad: number;
  precioUnitario: number;
  productoId?: string;
  productoNombre?: string;
  numeroLote?: string;
  codigoBarras?: string;
  imagenUrl?: string | null;
}

export interface BackendReservation {
  id: string;
  usuarioId: string;
  /** Sin código mientras la tienda no acepta la reserva (PENDIENTE_SYNC) o si la rechazó. */
  codigoRetiro: string | null;
  /**
   * PENDIENTE_SYNC: la tienda aún está confirmando la reserva. RECHAZADA: la tienda no pudo
   * reservar (ver mensajeRechazo). Los demás estados son los de siempre.
   */
  estado: 'PENDIENTE_SYNC' | 'PENDIENTE' | 'CONFIRMADA' | 'EXPIRADA' | 'CANCELADA' | 'RECHAZADA';
  fechaExpiracion: string;
  detalles: ReservationDetail[];
  motivoRechazo?: string;
  mensajeRechazo?: string;
  clienteNombre?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CatalogStatus {
  success: boolean;
  mode: 'mirror' | 'direct';
  /** true si falta alguna sección o la copia lleva demasiado sin sincronizarse con la tienda. */
  stale: boolean;
  lastSyncAt: string | null;
  message?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
  token?: string;
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

  // Categories
  async getCategories(): Promise<BackendCategory[]> {
    const res = await apiClient.get<{ success: boolean; data: BackendCategory[] }>('/categories');
    return res.data.data || [];
  },

  // Products
  // El catálogo completo (unos cientos de productos) se recorre en páginas de 100, el máximo del
  // backend: así los pasillos, los filtros y las ofertas del portal cuentan todos los productos.
  async getAllProducts(): Promise<BackendProduct[]> {
    const pageSize = 100;
    const all: BackendProduct[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const page = await this.getProductsPage({ limit: pageSize, offset });
      all.push(...page.items);
      if (page.items.length < pageSize || all.length >= page.total) return all;
    }
  },

  async getProductsPage(params?: {
    q?: string;
    categoriaId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: BackendProduct[]; total: number; limit: number; offset: number }> {
    const res = await apiClient.get<{ success: boolean; data: BackendProduct[]; total?: number; limit?: number; offset?: number }>('/products', {
      params: {
        q: params?.q?.trim() || undefined,
        categoriaId: params?.categoriaId || undefined,
        limit: params?.limit ?? 30,
        offset: params?.offset ?? 0,
      },
    });
    return {
      items: res.data.data || [],
      total: Number(res.data.total ?? (res.data.data ? res.data.data.length : 0)),
      limit: Number(res.data.limit ?? params?.limit ?? 30),
      offset: Number(res.data.offset ?? params?.offset ?? 0),
    };
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

  // Estado de la copia del catálogo que mantiene el portal (ADR-003). Si el backend no lo expone, se ignora.
  async getCatalogStatus(): Promise<CatalogStatus | null> {
    try {
      const res = await apiClient.get<CatalogStatus>('/catalog/status', { timeout: 4000 });
      return res.data;
    } catch {
      return null;
    }
  },

  // Anti-Overbooking Reservations (FEFO)
  async createReservation(payload: CreateReservationRequest): Promise<BackendReservation> {
    try {
      const res = await apiClient.post<{ success: boolean; data: BackendReservation }>('/reservations', payload);
      return res.data.data;
    } catch (err: unknown) {
      throw new Error(getServerMessage(err) ?? 'No se pudo conectar con el servidor para crear la reserva.');
    }
  },

  async getReservationByCode(code: string): Promise<BackendReservation> {
    try {
      const res = await apiClient.get<{ success: boolean; data: BackendReservation }>(`/reservations/code/${encodeURIComponent(code.trim())}`);
      return res.data.data;
    } catch (err: unknown) {
      throw new Error(getServerMessage(err) ?? 'No se pudo conectar con el servidor para consultar la reserva.');
    }
  },

  async extendReservation(id: string, minutosAdicionales = 30): Promise<BackendReservation> {
    try {
      const res = await apiClient.post<{ success: boolean; data: BackendReservation }>(`/reservations/${encodeURIComponent(id)}/extend`, {
        minutosAdicionales
      });
      return res.data.data;
    } catch (err: unknown) {
      throw new Error(getServerMessage(err) ?? 'No se pudo extender el tiempo de la reserva.');
    }
  },

  // Authentication
  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    try {
      const res = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/login', credentials);
      return res.data.data;
    } catch (err: unknown) {
      throw new Error(getServerMessage(err) ?? 'No se pudo conectar con el servidor para iniciar sesión.');
    }
  },

  async register(data: { nombre: string; email: string; password: string; rol?: string }): Promise<AuthResponse> {
    try {
      const res = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/register', data);
      return res.data.data;
    } catch (err: unknown) {
      throw new Error(getServerMessage(err) ?? 'No se pudo conectar con el servidor para crear la cuenta.');
    }
  },

  async logout() {
    await apiClient.post('/auth/logout');
  },

  async getUserReservations(userId: string): Promise<BackendReservation[]> {
    const response = await apiClient.get<{ success: boolean; data: BackendReservation[] }>(
      `/reservations/user/${encodeURIComponent(userId)}`
    );
    return response.data.data || [];
  },

  async cancelReservation(id: string): Promise<BackendReservation> {
    const response = await apiClient.post<{ success: boolean; data: BackendReservation }>(
      `/reservations/${encodeURIComponent(id)}/cancel`
    );
    return response.data.data;
  },

  async getCurrentUser(): Promise<{ id: string; nombre: string; email: string; rol: string } | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: { user: { id: string; nombre: string; email: string; rol: string } } }>('/auth/me');
      return response.data.data.user;
    } catch {
      return null;
    }
  }
};
