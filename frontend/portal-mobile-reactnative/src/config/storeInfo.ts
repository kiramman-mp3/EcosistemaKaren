// Único origen de los datos de la tienda en la app del portal. Cada valor puede sobrescribirse al
// compilar con su variable EXPO_PUBLIC_STORE_* (ver .env.example). Expo solo inlinea la variable
// si se lee literalmente como process.env.EXPO_PUBLIC_..., por eso no se recorre process.env.
export const STORE_INFO = {
  /** Nombre comercial: el que ve el cliente. La tienda es única, no hay sucursales. */
  tradeName: process.env.EXPO_PUBLIC_STORE_TRADE_NAME || 'Supermercado Karen',
  /** Razón social del RUC (persona natural). */
  legalName: process.env.EXPO_PUBLIC_STORE_LEGAL_NAME || 'Patricia Rodríguez',
  ruc: process.env.EXPO_PUBLIC_STORE_RUC || '1850410612001',
  address: process.env.EXPO_PUBLIC_STORE_ADDRESS || 'Av. 17 de Abril y García Moreno',
  city: process.env.EXPO_PUBLIC_STORE_CITY || 'Quero, Tungurahua',
  whatsapp: { number: '593983553724', label: '+593 98 355 3724' },
  // Correo y horario todavía son de ejemplo: reemplazarlos cuando la tienda los confirme.
  privacyEmail: 'privacidad@karen.com.ec',
  hoursSentence: 'Lunes a Sábado de 07:00 a 21:00 y Domingos o Feriados de 08:00 a 19:00',
} as const;

/** Enlace de WhatsApp de la tienda con un mensaje inicial. */
export const whatsappLink = (text: string) =>
  `https://wa.me/${STORE_INFO.whatsapp.number}?text=${encodeURIComponent(text)}`;
