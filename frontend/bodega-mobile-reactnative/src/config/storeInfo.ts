// Datos de la empresa que se imprimen en los reportes. Cada valor puede sobrescribirse al compilar con
// su variable EXPO_PUBLIC_STORE_* (ver .env.example). Expo solo inlinea la variable si se lee
// literalmente como process.env.EXPO_PUBLIC_..., por eso no se recorre process.env.
export const STORE_INFO = {
  /** Nombre comercial. La tienda es única, no hay sucursales. */
  tradeName: process.env.EXPO_PUBLIC_STORE_TRADE_NAME || 'Supermercado Karen',
  /** Razón social del RUC (persona natural). */
  legalName: process.env.EXPO_PUBLIC_STORE_LEGAL_NAME || 'Patricia Rodríguez',
  ruc: process.env.EXPO_PUBLIC_STORE_RUC || '1850410612001',
  address: process.env.EXPO_PUBLIC_STORE_ADDRESS || 'Av. 17 de Abril y García Moreno',
  city: process.env.EXPO_PUBLIC_STORE_CITY || 'Quero, Tungurahua',
} as const;
