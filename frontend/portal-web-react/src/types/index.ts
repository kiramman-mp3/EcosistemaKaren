export type NavTab = 'inicio' | 'productos' | 'ofertas';

export type ProductCategory = 
  | 'Todos' 
  | 'Carnes' 
  | 'Lácteos' 
  | 'Frutas' 
  | 'Panadería' 
  | 'Verduras' 
  | 'Conservas'
  | 'Bebidas'
  | 'Snacks';

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
  image: string;
}

export interface CategoryItem {
  id: ProductCategory;
  name: string;
  icon: string;
  count: number;
  bgGradient: string;
}

export interface ReservationPass {
  code: string;
  status: 'ACTIVA' | 'EXPIRADA' | 'COMPLETADA';
  initialSeconds: number;
  remainingSeconds: number;
  customerName: string;
  storeLocation: string;
  qrBlocks: number[][]; // 2D matrix for custom QR block rendering
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
