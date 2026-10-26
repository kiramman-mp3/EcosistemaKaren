import axios from 'axios';
import { clearSession, loadSession, saveSession, StoredUser } from '../auth/secureSession';
import { getServerUrl, onServerUrlChange } from './serverConfig';

/** Las imágenes llegan como rutas del backend (/api/v1/media/...); la app necesita la URL completa. */
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return getServerUrl().replace(/\/api\/v1$/, '') + path;
}

export const apiClient = axios.create({
  baseURL: getServerUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 6000,
});

// La dirección puede cambiarse desde la app (ver ServerConfigModal): las peticiones siguientes usan la nueva.
onServerUrlChange(url => { apiClient.defaults.baseURL = url; });

let inMemoryToken: string | null = null;
let inMemoryUser: StoredUser | null = null;
let sessionExpiredListener: (() => void) | null = null;

apiClient.interceptors.request.use((config) => {
  if (inMemoryToken && config.headers) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      inMemoryToken = null;
      inMemoryUser = null;
      await clearSession();
      sessionExpiredListener?.();
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
  /** Unidades vendidas en los últimos 30 días (lo calcula la tienda). */
  vendidos30d?: number;
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
  /** Límites que fija el ADMIN (null = sin tope) y unidades con descuento que quedan. */
  limitePorPedido?: number | null;
  stockOferta?: number | null;
  vigenteHasta?: string | null;
  unidadesRestantes?: number | null;
}

export interface CatalogStatus {
  success: boolean;
  mode: 'mirror' | 'direct';
  /** true si falta alguna sección o la copia lleva demasiado sin sincronizarse con la tienda. */
  stale: boolean;
  lastSyncAt: string | null;
  message?: string;
}

export interface CreateReservationRequest {
  usuarioId: string;
  /** Cuánto tiempo se aparta (el backend acepta de 15 a 240 minutos; la app ofrece de 30 a 120). Sin él, 30. */
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

  // 2. Categories
  async getCategories(): Promise<BackendCategory[]> {
    const res = await apiClient.get<{ success: boolean; data: BackendCategory[] }>('/categories');
    return res.data.data || [];
  },

  // 3. Products
  // Sin limit el backend devuelve solo 30 productos: se recorren todas las páginas de 100.
  async getProducts(): Promise<BackendProduct[]> {
    const pageSize = 100;
    const all: BackendProduct[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const res = await apiClient.get<{ success: boolean; data: BackendProduct[]; total?: number }>('/products', {
        params: { limit: pageSize, offset },
      });
      const items = res.data.data || [];
      all.push(...items);
      if (items.length < pageSize || all.length >= Number(res.data.total ?? all.length)) return all;
    }
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

  /**
   * Suma tiempo a una reserva por retirar. La tienda confirma el nuevo vencimiento y el servidor puede tardar
   * hasta ~8 s en recibir su respuesta, por eso el plazo es mayor que el de las demás solicitudes.
   */
  async extendReservation(id: string, minutosAdicionales: number): Promise<BackendReservation> {
    const res = await apiClient.post<{ success: boolean; data: BackendReservation }>(
      `/reservations/${encodeURIComponent(id)}/extend`, { minutosAdicionales }, { timeout: 15000 }
    );
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
      await saveSession(inMemoryToken, inMemoryUser);
    }
    return res.data.data;
  },

  async register(data: { nombre: string; email: string; password: string; rol?: string }): Promise<AuthResponse> {
    const res = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/register', data);
    if (res.data.data?.token) {
      inMemoryToken = res.data.data.token;
      inMemoryUser = res.data.data.user;
      await saveSession(inMemoryToken, inMemoryUser);
    }
    return res.data.data;
  },

  async logout() {
    inMemoryToken = null;
    inMemoryUser = null;
    await clearSession();
  },

  getCurrentUser() {
    return inMemoryUser;
  },

  setToken(token: string | null, user: StoredUser | null = null) {
    inMemoryToken = token;
    inMemoryUser = user;
  },

  async restoreSession(): Promise<StoredUser | null> {
    const session = await loadSession();
    inMemoryToken = session?.token || null;
    inMemoryUser = session?.user || null;
    return inMemoryUser;
  },

  onSessionExpired(listener: (() => void) | null) {
    sessionExpiredListener = listener;
    return () => { if (sessionExpiredListener === listener) sessionExpiredListener = null; };
  },
};
