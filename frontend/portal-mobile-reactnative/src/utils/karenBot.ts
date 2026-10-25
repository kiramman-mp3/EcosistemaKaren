
// Respuestas de KarenBot, el mismo asistente de preguntas frecuentes del portal web.
import { STORE_INFO, whatsappLink } from '../config/storeInfo';
import { RESERVATION_MAX_TOTAL_MINUTES, RESERVATION_RANGE_TEXT, formatMinutes } from '../config/reservationRules';

export interface BotReply {
  text: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface FaqChip extends BotReply {
  label: string;
  query: string;
}

export const WELCOME_TEXT = `¡Hola! Soy KarenBot, tu asistente virtual de ${STORE_INFO.tradeName}. ¿En qué te puedo ayudar hoy con tus reservas u ofertas?`;

export const FAQ_CHIPS: FaqChip[] = [
  {
    label: '¿Cómo retiro con mi código KR?',
    query: 'como retiro con el codigo',
    text: `¡Es muy fácil! Cuando confirmas tu reserva generas un Pase de Retiro con un código como "KR-XXXXXX" y un código QR. Solo debes acercarte a Caja SIACI en ${STORE_INFO.tradeName}, mostrar el código a la cajera y pagar tus productos antes de que se acabe el tiempo de la reserva (el que elegiste al apartar; si te falta, sumas 30 minutos más desde Mis reservas).`,
  },
  {
    label: '¿Qué pasa si se acaba el tiempo?',
    query: 'que pasa si se acaba el tiempo',
    text: `Por nuestra política anti-overbooking y respeto a los clientes en tienda, el stock se aparta por el tiempo que elijas (${RESERVATION_RANGE_TEXT}). Antes de que termine puedes sumar 30 minutos más desde Mis reservas, hasta ${formatMinutes(RESERVATION_MAX_TOTAL_MINUTES)} en total. Si el tiempo expira, los productos vuelven automáticamente a la percha física. No hay multas ni penalizaciones, ¡puedes volver a reservar cuando estés cerca!`,
  },
  {
    label: '¿Qué formas de pago aceptan?',
    query: 'formas de pago aceptadas',
    text: 'En Caja SIACI aceptamos Efectivo (USD), todas las tarjetas de Débito y Crédito (Visa, Mastercard, Diners, American Express) y Transferencia bancaria directa verificada al instante.',
  },
  {
    label: 'Horarios y ubicación de la tienda',
    query: 'horarios y ubicacion',
    text: `${STORE_INFO.tradeName} está en ${STORE_INFO.address}, ${STORE_INFO.city}. Atendemos de ${STORE_INFO.hoursSentence}.`,
  },
  {
    label: 'Hablar con un asesor en WhatsApp',
    query: 'whatsapp asesor humano',
    text: 'Si necesitas asistencia personalizada, puedes escribir directamente a nuestra línea oficial de WhatsApp:',
    actionUrl: whatsappLink(`Hola ${STORE_INFO.tradeName}, necesito ayuda con una reserva`),
    actionLabel: `Abrir WhatsApp (${STORE_INFO.whatsapp.label})`,
  },
];

const FALLBACK = 'Gracias por escribirnos. Para consultas específicas sobre productos o reservas especiales, te recomendamos contactar directamente a nuestro personal de atención en tienda.';

/** Respuesta automática a un mensaje libre o a un chip de preguntas frecuentes. */
export function replyTo(message: string): BotReply {
  const lower = message.toLowerCase();

  const faq = FAQ_CHIPS.find(chip => lower.includes(chip.query) || lower.includes(chip.label.toLowerCase().slice(0, 15)));
  if (faq) return { text: faq.text, actionUrl: faq.actionUrl, actionLabel: faq.actionLabel };

  if (['reserva', 'tiempo', 'minuto', 'ttl'].some(word => lower.includes(word))) {
    return { text: `Las reservas duran el tiempo que elijas al apartar (${RESERVATION_RANGE_TEXT}) y puedes sumar 30 minutos más desde Mis reservas, hasta ${formatMinutes(RESERVATION_MAX_TOTAL_MINUTES)} en total. Una vez confirmada en el carrito, dirígete a caja con tu código KR-XXXXXX antes de que el temporizador llegue a cero.` };
  }
  if (['oferta', 'descuento', 'fefo', 'caducidad'].some(word => lower.includes(word))) {
    return { text: 'Nuestras ofertas por vencer (FEFO) son lotes auditados con descuentos del 5% al 50%. Tienen la misma calidad garantizada y puedes apartarlas para asegurar tu precio promocional. Algunas tienen un máximo por pedido, pocas unidades con descuento o una hora de fin: lo verás en cada oferta.' };
  }
  if (['pago', 'tarjeta', 'efectivo', 'precio'].some(word => lower.includes(word))) {
    return { text: 'El pago se realiza en caja física al momento de retirar tu pedido. Aceptamos efectivo, tarjetas y transferencias.' };
  }
  if (['hola', 'buenas', 'buenos dias'].some(word => lower.includes(word))) {
    return { text: `¡Hola! Un gusto saludarte. ¿En qué podemos orientarte sobre tu compra o reserva en ${STORE_INFO.tradeName}?` };
  }
  if (['humano', 'asesor', 'whatsapp', 'telefono'].some(word => lower.includes(word))) {
    return {
      text: 'Con gusto te comunicamos con nuestro equipo de atención humana en WhatsApp:',
      actionUrl: whatsappLink(`Hola ${STORE_INFO.tradeName}, necesito asistencia personalizada`),
      actionLabel: 'Contactar a Asesor por WhatsApp',
    };
  }
  return { text: FALLBACK };
}
