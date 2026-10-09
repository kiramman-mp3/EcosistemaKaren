export type NavTab = 'inicio' | 'productos' | 'ofertas';

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
  unit?: string;
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
  image: string;
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
  remainingSeconds: number;
  storeLocation: string;
  qrBlocks: number[][];
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
