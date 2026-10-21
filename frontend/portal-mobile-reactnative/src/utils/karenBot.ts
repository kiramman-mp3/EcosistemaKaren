// Respuestas de KarenBot, el mismo asistente de preguntas frecuentes del portal web.

export interface BotReply {
  text: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface FaqChip extends BotReply {
  label: string;
  query: string;
}

export const WELCOME_TEXT = '¡Hola! Soy KarenBot, tu asistente virtual de Supermercados Karen. ¿En qué te puedo ayudar hoy con tus reservas u ofertas?';

const WHATSAPP = 'https://wa.me/593983553724';

export const FAQ_CHIPS: FaqChip[] = [
  {
    label: '¿Cómo retiro con mi código KR?',
    query: 'como retiro con el codigo',
    text: '¡Es muy fácil! Cuando confirmas tu reserva generas un Pase de Retiro con un código como "KR-XXXXXX" y un código QR. Solo debes acercarte a Caja SIACI en la Sucursal Matriz, mostrar el código a la cajera y pagar tus productos antes de que finalicen los 30 minutos.',
  },
  {
    label: '¿Qué pasa si pasan los 30 minutos?',
    query: 'que pasa si pasan los 30 minutos',
    text: 'Por nuestra política anti-overbooking y respeto a los clientes en tienda, el stock se aparta exactamente por 30 minutos. Si el tiempo expira, los productos vuelven automáticamente a la percha física. No hay multas ni penalizaciones, ¡puedes volver a reservar cuando estés cerca!',
  },
  {
    label: '¿Qué formas de pago aceptan?',
    query: 'formas de pago aceptadas',
    text: 'En Caja SIACI aceptamos Efectivo (USD), todas las tarjetas de Débito y Crédito (Visa, Mastercard, Diners, American Express) y Transferencia bancaria directa verificada al instante.',
  },
  {
    label: 'Horarios y ubicación de la tienda',
    query: 'horarios y ubicacion',
    text: 'Nuestra Sucursal Matriz está ubicada en Av. Principal y Calle 4ta, Guayaquil. Atendemos de Lunes a Sábado de 07:00 a 21:00 y Domingos o Feriados de 08:00 a 19:00.',
  },
  {
    label: 'Hablar con un asesor en WhatsApp',
    query: 'whatsapp asesor humano',
    text: 'Si necesitas asistencia personalizada, puedes escribir directamente a nuestra línea oficial de WhatsApp:',
    actionUrl: `${WHATSAPP}?text=${encodeURIComponent('Hola Supermercado Karen, necesito ayuda con una reserva')}`,
    actionLabel: 'Abrir WhatsApp (+593 98 355 3724)',
  },
];

const FALLBACK = 'Gracias por escribirnos. Para consultas específicas sobre productos o reservas especiales, te recomendamos contactar directamente a nuestro personal de atención en tienda.';

/** Respuesta automática a un mensaje libre o a un chip de preguntas frecuentes. */
export function replyTo(message: string): BotReply {
  const lower = message.toLowerCase();

  const faq = FAQ_CHIPS.find(chip => lower.includes(chip.query) || lower.includes(chip.label.toLowerCase().slice(0, 15)));
  if (faq) return { text: faq.text, actionUrl: faq.actionUrl, actionLabel: faq.actionLabel };

  if (['reserva', 'tiempo', 'minuto', 'ttl'].some(word => lower.includes(word))) {
    return { text: 'Las reservas tienen una duración de 30 minutos. Una vez confirmada en el carrito, dirígete a caja con tu código KR-XXXXXX antes de que el temporizador llegue a cero.' };
  }
  if (['oferta', 'descuento', 'fefo', 'caducidad'].some(word => lower.includes(word))) {
    return { text: 'Nuestras ofertas por vencer (FEFO) son lotes auditados con descuentos del 20% al 50%. Tienen la misma calidad garantizada y puedes apartarlas para asegurar tu precio promocional.' };
  }
  if (['pago', 'tarjeta', 'efectivo', 'precio'].some(word => lower.includes(word))) {
    return { text: 'El pago se realiza en caja física al momento de retirar tu pedido. Aceptamos efectivo, tarjetas y transferencias.' };
  }
  if (['hola', 'buenas', 'buenos dias'].some(word => lower.includes(word))) {
    return { text: '¡Hola! Un gusto saludarte. ¿En qué podemos orientarte sobre tu compra o reserva en Supermercados Karen?' };
  }
  if (['humano', 'asesor', 'whatsapp', 'telefono'].some(word => lower.includes(word))) {
    return {
      text: 'Con gusto te comunicamos con nuestro equipo de atención humana en WhatsApp:',
      actionUrl: `${WHATSAPP}?text=${encodeURIComponent('Hola Supermercado Karen, necesito asistencia personalizada')}`,
      actionLabel: 'Contactar a Asesor por WhatsApp',
    };
  }
  return { text: FALLBACK };
}
