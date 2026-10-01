export type BodegaTab = 'ingreso' | 'alertas' | 'inventario' | 'caja';

export type UbicacionLote = 'BODEGA' | 'PERCHA';
export type NivelAlerta = 'ROJO' | 'AMARILLO' | 'NORMAL' | 'VENCIDO';

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
  ubicacion: UbicacionLote;
  estado: string; // ACTIVO | VENCIDO | AGOTADO | MERMA
  created_at?: string;
  updated_at?: string;
  productoNombre?: string;
  codigoBarras?: string;
}

export interface ExpiryAlertItem {
  id: string;
  loteId: string;
  numeroLote: string;
  productoNombre: string;
  codigoBarras: string;
  fechaCaducidad: string;
  diasParaVencer: number;
  nivel: NivelAlerta;
  cantidadDisponible: number;
  cantidadReservada: number;
  ubicacion: UbicacionLote;
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

export interface CreateLotPayload {
  productoId: string;
  numeroLote: string;
  fechaCaducidad: string;
  cantidadIngresada: number;
  ubicacion: UbicacionLote;
}
