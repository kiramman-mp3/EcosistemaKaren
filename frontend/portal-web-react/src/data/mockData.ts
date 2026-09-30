import { Product, FlashOffer, CategoryItem, ReservationPass } from '../types';

export const CATEGORIES_DATA: CategoryItem[] = [
  { id: 'Carnes', name: 'Carnes', icon: '🥩', count: 48, bgGradient: 'from-rose-50 to-red-100/50' },
  { id: 'Verduras', name: 'Verduras', icon: '🥦', count: 72, bgGradient: 'from-emerald-50 to-green-100/50' },
  { id: 'Panadería', name: 'Panadería', icon: '🥖', count: 35, bgGradient: 'from-amber-50 to-orange-100/50' },
  { id: 'Lácteos', name: 'Lácteos', icon: '🥛', count: 54, bgGradient: 'from-blue-50 to-indigo-100/50' },
  { id: 'Bebidas', name: 'Bebidas', icon: '🥤', count: 63, bgGradient: 'from-cyan-50 to-sky-100/50' },
  { id: 'Snacks', name: 'Snacks', icon: '🍿', count: 41, bgGradient: 'from-violet-50 to-purple-100/50' }
];

export const PRODUCTS_CATALOG: Product[] = [
  {
    id: 'prod-01',
    name: 'Leche Entera Pasteurizada 1 Litro',
    category: 'Lácteos',
    price: 0.95,
    originalPrice: 1.20,
    stock: 90,
    badge: 'Lácteos',
    unit: '1L',
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'prod-02',
    name: 'Yogurt Griego Toni Natural 500g',
    category: 'Lácteos',
    price: 2.50,
    originalPrice: 3.25,
    stock: 45,
    badge: 'Lácteos',
    unit: '500g',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'prod-03',
    name: 'Corte Lomo Fino de Res Premium',
    category: 'Carnes',
    price: 6.80,
    originalPrice: 8.50,
    stock: 18,
    badge: 'Carnes',
    unit: '1 Kg',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'prod-04',
    name: 'Pechuga de Pollo Fresca en Filetes',
    category: 'Carnes',
    price: 3.90,
    originalPrice: 4.80,
    stock: 32,
    badge: 'Carnes',
    unit: '1 Kg',
    image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'prod-05',
    name: 'Pan Artesanal de Masa Madre',
    category: 'Panadería',
    price: 1.85,
    originalPrice: 2.40,
    stock: 24,
    badge: 'Panadería',
    unit: 'Unidad',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'prod-06',
    name: 'Brócoli Fresco Orgánico de Granja',
    category: 'Verduras',
    price: 1.10,
    originalPrice: 1.50,
    stock: 40,
    badge: 'Verduras',
    unit: '500g',
    image: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'prod-07',
    name: 'Tomate Riñón de Invernadero',
    category: 'Verduras',
    price: 0.85,
    originalPrice: 1.15,
    stock: 65,
    badge: 'Verduras',
    unit: '1 Kg',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'prod-08',
    name: 'Manzana Gala Roja Importada',
    category: 'Frutas',
    price: 2.20,
    originalPrice: 2.90,
    stock: 50,
    badge: 'Frutas',
    unit: '1 Kg',
    image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'prod-09',
    name: 'Atún en Aceite de Oliva 160g',
    category: 'Conservas',
    price: 1.65,
    originalPrice: 2.10,
    stock: 85,
    badge: 'Conservas',
    unit: 'Lata 160g',
    image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=600&q=80'
  }
];

export const FLASH_OFFERS_DATA: FlashOffer[] = [
  {
    id: 'offer-01',
    title: 'Yogurt Griego Toni Natural 500g (Lote FEFO)',
    category: 'Lácteos Frescos',
    discountBadge: '-40%',
    aiBadge: true,
    urgencyBadge: '¡Últimas 4 un.!',
    price: 2.50,
    originalPrice: 4.20,
    stockTotal: 20,
    stockAvailable: 4,
    expiryText: '⏰ Caduca: Hoy, 20:00',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'offer-02',
    title: 'Queso Mozzarella Artesanal Fresco 400g',
    category: 'Charcutería',
    discountBadge: '-45%',
    aiBadge: true,
    urgencyBadge: '¡Últimas 6 un.!',
    price: 2.99,
    originalPrice: 5.45,
    stockTotal: 25,
    stockAvailable: 6,
    expiryText: '⏰ Caduca: Mañana, 12:00',
    image: 'https://images.unsplash.com/photo-1589881133595-a3c085cb731d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'offer-03',
    title: 'Pack Fresas Frescas de Altura 500g',
    category: 'Frutas',
    discountBadge: '-50%',
    aiBadge: true,
    urgencyBadge: '¡Últimas 3 un.!',
    price: 1.45,
    originalPrice: 2.90,
    stockTotal: 15,
    stockAvailable: 3,
    expiryText: '⏰ Caduca: Hoy, 21:30',
    image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'offer-04',
    title: 'Croissants de Mantequilla Horneados Hoy',
    category: 'Panadería',
    discountBadge: '-35%',
    aiBadge: true,
    urgencyBadge: '¡Últimas 5 un.!',
    price: 1.95,
    originalPrice: 3.00,
    stockTotal: 18,
    stockAvailable: 5,
    expiryText: '⏰ Caduca: Hoy, 22:00',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80'
  }
];

// Sample QR Matrix pattern (7x7 blocks for stylized QR code)
export const SAMPLE_QR_MATRIX: number[][] = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [0, 1, 0, 1, 0, 1, 0],
  [1, 1, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 0, 1, 1]
];

export const INITIAL_SAMPLE_PASS: ReservationPass = {
  code: 'KR-X7Y9Z2',
  status: 'ACTIVA',
  initialSeconds: 585, // 9 min 45 sec
  remainingSeconds: 585,
  customerName: 'Cliente Supermercado Karen',
  storeLocation: 'Sucursal Matriz - Calle Principal 102',
  qrBlocks: SAMPLE_QR_MATRIX,
  items: [
    { productName: 'Yogurt Griego Toni 500g', quantity: 2, price: 2.50, lotCode: 'LOT-YG-2026' },
    { productName: 'Leche Entera Vita 1L', quantity: 1, price: 0.95, lotCode: 'LOT-VT-2026' }
  ],
  total: 5.95
};
