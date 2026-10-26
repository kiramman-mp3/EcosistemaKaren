export type NavTab = 'inicio' | 'productos' | 'ofertas' | 'reservas';

export type ProductCategory = string;

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  originalPrice?: number;
  stock: number;
  image: string;
  badge?: string;
  expiryDate?: string;
  unit?: string;
  description?: string;
  barcode?: string;
  reservationProductId?: string;
  promotionId?: string;
  offerLotId?: string;
  isOffer?: boolean;
  /** Unidades de la oferta que admite un pedido (el carrito no deja pasar de ahí). */
  maxPerOrder?: number | null;
  /** Alta real del producto en la tienda y unidades vendidas en los últimos 30 días. */
  createdAt?: string;
  soldLast30d?: number;
  /** Insignias calculadas con las reglas de config/catalogRules. */
  isNew?: boolean;
  isBestSeller?: boolean;
}

export interface FlashOffer {
  id: string;
  title: string;
  category: string;
  discountBadge: string; // e.g. "-40%"
  aiBadge: boolean;      // "✨ IA"
  urgencyBadge: string;  // "¡Últimas 4 un.!"
  price: number;
  originalPrice: number;
  stockTotal: number;
  stockAvailable: number;
  expiryText: string;    // "⏰ Caduca: Hoy, 20:00"
  expiresOn?: string;    // AAAA-MM-DD del lote en oferta
  maxPerOrder?: number | null; // límite por pedido que fijó la tienda
  endsAt?: string | null;      // fecha y hora real de fin de la oferta
  productName?: string;
  image: string;
  loteId?: string;
  productId?: string;
  razonIa?: string;
}

export interface CategoryItem {
  id: ProductCategory;
  name: string;
  icon: string;
  count: number;
  bgGradient: string;
}

export interface ReservationPass {
  id?: string;
  code: string;
  status: 'ACTIVA' | 'EXPIRADA' | 'COMPLETADA';
  initialSeconds: number;
  remainingSeconds: number;
  customerName: string;
  storeLocation: string;
  items: {
    productName: string;
    quantity: number;
    price: number;
    lotCode: string;
  }[];
  total: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type DataLoadState = 'loading' | 'ready' | 'empty' | 'offline' | 'error';
