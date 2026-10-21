export type NavTab = 'inicio' | 'productos' | 'ofertas' | 'reservas';

export type ProductCategory = string;

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  originalPrice?: number;
  stock: number;
  image: string | null;
  badge?: string;
  unit?: string;
  description?: string;
  barcode?: string;
}

export interface FlashOffer {
  id: string;
  title: string;
  category: string;
  discountBadge: string;
  aiBadge: boolean;
  urgencyBadge: string;
  price: number;
  originalPrice: number;
  stockTotal: number;
  stockAvailable: number;
  expiryText: string;
  expiresOn?: string;
  productName?: string;
  image: string | null;
  loteId?: string;
  productId?: string;
}

export interface CategoryItem {
  id: ProductCategory;
  name: string;
  icon: string;
  count: number;
}

export interface ReservationPass {
  code: string;
  status: string;
  /** Duración total de la reserva; si falta se asume la de 10 minutos. */
  initialSeconds?: number;
  remainingSeconds: number;
  storeLocation: string;
  customerName?: string;
  items: {
    productName: string;
    quantity: number;
    price: number;
  }[];
  total: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type DataLoadState = 'loading' | 'ready' | 'empty' | 'offline' | 'error';
