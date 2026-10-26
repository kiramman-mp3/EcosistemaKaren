// Único origen de los datos de la tienda en el portal web. Cada valor puede sobrescribirse en el
// despliegue con su variable VITE_STORE_* (ver .env.example) sin tocar los componentes.
const env = import.meta.env;

const coordinate = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) ? parsed : fallback;
};

export const STORE_INFO = {
  /** Nombre comercial: el que ve el cliente. La tienda es única, no hay sucursales. */
  tradeName: env.VITE_STORE_TRADE_NAME || 'Supermercado Karen',
  /** Razón social del RUC (persona natural). */
  legalName: env.VITE_STORE_LEGAL_NAME || 'Patricia Rodríguez',
  ruc: env.VITE_STORE_RUC || '1850410612001',
  address: env.VITE_STORE_ADDRESS || 'Av. 17 de Abril y García Moreno',
  city: env.VITE_STORE_CITY || 'Quero, Tungurahua',
  coords: {
    lat: coordinate(env.VITE_STORE_LAT, -1.3790517),
    lng: coordinate(env.VITE_STORE_LNG, -78.6087482),
  },
  whatsapp: { number: '593983553724', label: '+593 98 355 3724' },
  facebookUrl: 'https://www.facebook.com/profile.php?id=100063795716014',
  // Teléfono, correos y horario todavía son de ejemplo: reemplazarlos cuando la tienda los confirme.
  phone: { href: 'tel:+59342987654', label: '(04) 2-987654 / 2-987655' },
  email: 'atencion@karen.com.ec',
  privacyEmail: 'privacidad@karen.com.ec',
  hours: {
    long: 'Lunes a Sábado: 07:00 – 21:00 · Domingos: 08:00 – 19:00',
    short: 'Lun a Sáb: 07:00 – 21:00 · Dom: 08:00 – 19:00',
    sentence: 'Lunes a Sábado de 07:00 a 21:00 y Domingos o Feriados de 08:00 a 19:00',
  },
} as const;

/** Enlace de WhatsApp de la tienda con un mensaje inicial. */
export const whatsappLink = (text: string) =>
  `https://wa.me/${STORE_INFO.whatsapp.number}?text=${encodeURIComponent(text)}`;

/** Dirección completa para mostrar o copiar. */
export const STORE_FULL_ADDRESS = `${STORE_INFO.address}, ${STORE_INFO.city}, Ecuador`;
