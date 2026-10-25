export type BodegaTab = 'ingreso' | 'catalogo' | 'alertas' | 'inventario' | 'caja' | 'reportes' | 'promociones';
export type StaffRole = 'BODEGUERO' | 'PERCHERO' | 'ADMIN';

export type UbicacionLote = 'BODEGA' | 'PERCHA';
export type NivelAlerta = 'ROJO' | 'AMARILLO' | 'NORMAL' | 'VENCIDO';

export interface BackendCategory {
  id: string;
  nombre: string;
  descripcion?: string;
  created_at?: string;
}

/** Resultado de subir una foto de producto: lo que el servidor recibió y lo que guardó tras comprimirla. */
export interface ProductImageInfo {
  width: number;
  height: number;
  bytes: number;
  originalBytes: number;
}

export interface BackendProduct {
  id: string;
  categoriaId: string;
  codigoBarras: string;
  nombre: string;
  descripcion?: string;
  precioVenta: number;
  impuestoPorcentaje: number;
  minStockAlerta: number;
  imagenUrl?: string | null;
  aliasId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProductPayload {
  categoriaId: string;
  codigoBarras: string;
  nombre: string;
  descripcion?: string;
  precioVenta: number;
  impuestoPorcentaje: number;
  minStockAlerta?: number;
}

export interface BackendLot {
  id: string;
  productoId: string;
  numeroLote: string;
  fechaElaboracion?: string | null;
  fechaCaducidad: string;
  costoUnitario?: number | null;
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
  estado?: 'PENDIENTE_APROBACION' | 'APROBADA' | 'RECHAZADA';
  cacheHit?: boolean;
  created_at?: string;
  motivoRechazo?: string;
  productoNombre?: string | null;
  numeroLote?: string | null;
  fechaCaducidad?: string | null;
  cantidadDisponible?: number | null;
  // Límites que fija el ADMIN (null = sin tope) y unidades con descuento que quedan.
  limitePorPedido?: number | null;
  stockOferta?: number | null;
  vigenteHasta?: string | null;
  unidadesRestantes?: number | null;
}

export interface InventoryMovement {
  id: string;
  loteId: string;
  tipo: string;
  cantidad: number;
  disponibleAntes: number;
  disponibleDespues: number;
  reservadaAntes: number;
  reservadaDespues: number;
  ubicacionOrigen?: UbicacionLote | null;
  ubicacionDestino?: UbicacionLote | null;
  motivo?: string;
  actorId?: string | null;
  actorNombre?: string | null;
  numeroLote?: string;
  productoNombre?: string;
  codigoBarras?: string;
  costoUnitario?: number | null;
  precioVenta?: number | null;
  fechaElaboracion?: string | null;
  fechaCaducidad?: string;
  reservaId?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/** Período de los indicadores del reporte: hoy, los últimos 7 o los últimos 30 días (incluido hoy). */
export type SummaryPeriod = 'hoy' | '7d' | '30d';

/** GET /inventory/summary: todas las cifras corresponden al mismo período. */
export interface InventorySummary {
  periodo: SummaryPeriod;
  desde: string;
  hasta: string;
  ingresos: number;
  ventas: number;
  mermas: number;
  costoMerma: number;
}

export interface InventoryWaste {
  id: string;
  loteId: string;
  movimientoId: string;
  cantidad: number;
  razon: string;
  costoUnitario: number | null;
  costoTotal: number | null;
  registradaPor: string;
  registradaPorNombre?: string;
  numeroLote?: string;
  productoNombre?: string;
  created_at: string;
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
  codigoRetiro: string;
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'EXPIRADA' | 'CANCELADA';
  fechaExpiracion: string;
  detalles: ReservationDetail[];
  clienteNombre?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateLotPayload {
  productoId: string;
  numeroLote: string;
  fechaElaboracion: string;
  fechaCaducidad: string;
  costoUnitario: number;
  cantidadIngresada: number;
  ubicacion: UbicacionLote;
  /** Solo ADMIN: nuevo PVP del producto, guardado en la misma transacción que el lote. */
  nuevoPrecioVenta?: number;
}

/** Cambio de PVP aplicado por el servidor. */
export interface PriceChange {
  anterior: number;
  nuevo: number;
}

export interface WasteAuditResult {
  lote: BackendLot;
  merma: {
    id: string;
    loteId: string;
    movimientoId: string;
    cantidad: number;
    razon: string;
    costoUnitario: number | null;
    costoTotal: number | null;
    registradaPor: string;
    created_at: string;
  };
  movimiento: Record<string, unknown>;
}
