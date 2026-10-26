import { STORE_INFO } from './storeInfo';
import {
  RESERVATION_EXTENSION_MINUTES, RESERVATION_MAX_TOTAL_MINUTES, RESERVATION_RANGE_TEXT, formatMinutes,
} from './reservationRules';

// Términos y condiciones del servicio: el mismo contenido del portal web, adaptado a la app. Cada cláusula
// pertenece a una pestaña; "todos" las muestra todas.
export type TermsCategory = 'todos' | 'privacidad' | 'reservas' | 'fefo' | 'pagos';

export const TERMS_TABS: { id: TermsCategory; label: string }[] = [
  { id: 'todos', label: 'Todas' },
  { id: 'privacidad', label: 'Privacidad y LOPDP' },
  { id: 'reservas', label: 'Reservas y tiempos' },
  { id: 'fefo', label: 'FEFO y ofertas' },
  { id: 'pagos', label: 'Pagos y retiro' },
];

export interface TermsClause {
  category: Exclude<TermsCategory, 'todos'>;
  title: string;
  intro: string;
  bullets: string[];
}

export const TERMS_INTRO = `Bienvenido al Portal Digital de ${STORE_INFO.tradeName}. Este servicio te permite reservar productos desde tu teléfono y retirarlos en el área de Caja SIACI de nuestra tienda en ${STORE_INFO.city}.`;

export const TERMS_CLAUSES: TermsClause[] = [
  {
    category: 'reservas',
    title: '1. Política de reserva y tiempo de retiro',
    intro: `Para garantizar la disponibilidad real y evitar la sobreventa entre compras digitales y clientes en percha, cada reserva confirmada aparta el stock físico por el plazo que eliges al apartar, ${RESERVATION_RANGE_TEXT}, contado desde su emisión en el servidor.`,
    bullets: [
      'El temporizador regresivo se ve en tiempo real en tu Pase de Retiro.',
      `Antes de que termine, puedes sumar ${RESERVATION_EXTENSION_MINUTES} minutos desde Mis reservas o desde el pase, cuantas veces lo necesites, hasta un máximo de ${formatMinutes(RESERVATION_MAX_TOTAL_MINUTES)} desde que se creó la reserva.`,
      'Si no te presentas en caja antes de que termine el plazo, el sistema libera automáticamente el stock reservado y lo devuelve a la percha.',
      'Cero penalizaciones: la expiración de una reserva no genera multas ni cobros. Puedes reservar de nuevo cuando quieras, según disponibilidad.',
    ],
  },
  {
    category: 'privacidad',
    title: '2. Privacidad y protección de datos personales (LOPDP Ecuador)',
    intro: `Conforme a la Ley Orgánica de Protección de Datos Personales (LOPDP) del Ecuador, ${STORE_INFO.tradeName} (${STORE_INFO.legalName}, RUC ${STORE_INFO.ruc}) garantiza la confidencialidad, integridad y uso autorizado de tu información.`,
    bullets: [
      'Datos recopilados: tu nombre completo, tu correo electrónico, el registro de tus pedidos y las consultas que haces al asistente KarenBot.',
      'Finalidad: gestionar tus reservas, verificar tu identidad en caja, darte soporte y emitir los comprobantes autorizados por el Servicio de Rentas Internas (SRI).',
      `No comercialización: ${STORE_INFO.tradeName} no comercializa, no alquila ni comparte tus datos personales con terceros ni con empresas de marketing.`,
      `Derechos ARCO: puedes ejercer tus derechos de acceso, rectificación, cancelación u oposición escribiendo a ${STORE_INFO.privacyEmail} o acudiendo a Atención al Cliente.`,
      'Almacenamiento en tu teléfono: la app guarda tu sesión en el almacenamiento seguro del dispositivo y tu preferencia de tema (claro u oscuro). No usamos rastreadores de publicidad. Al cerrar sesión se borra la sesión guardada.',
    ],
  },
  {
    category: 'fefo',
    title: '3. Sistema FEFO y precios de oferta flash',
    intro: `${STORE_INFO.tradeName} opera bajo el estándar FEFO (First Expired, First Out) para evitar el desperdicio de alimentos y asegurar la frescura de los lotes en tienda.`,
    bullets: [
      'Semáforo rojo (1 a 6 días): ofertas flash para lotes próximos a vencer.',
      'Semáforo amarillo (7 a 14 días): rotación preventiva con descuento preferencial.',
      'Semáforo verde (15 días o más): mercadería regular con caducidad estándar garantizada.',
      'Los productos en oferta flash corresponden a lotes con fechas de vencimiento próximas pero plenamente aptos para consumo humano. Los lotes de 0 días o menos se descartan como merma y nunca salen a la venta.',
      'La fecha de caducidad de cada lote se informa de forma transparente en la etiqueta del producto.',
      'Los descuentos generados con asistencia de Inteligencia Artificial (Google Gemini) son auditados y aprobados por la Gerencia de Tienda.',
      'Cada oferta puede tener un máximo de unidades por pedido, una cantidad limitada de unidades con descuento y una fecha y hora de fin, que se muestran en la oferta. Al reservar, la tienda confirma que la oferta sigue vigente y con unidades; si no, la reserva se rechaza y nada se cobra.',
    ],
  },
  {
    category: 'pagos',
    title: '4. Retiro en Caja SIACI',
    intro: `Al llegar a ${STORE_INFO.tradeName} (${STORE_INFO.address}, ${STORE_INFO.city}), acércate al área de cajas e indica que tienes una reserva web.`,
    bullets: [
      'Presenta el código de retiro (formato KR-XXXXXX) o muestra el código QR en la pantalla de tu teléfono.',
      'El personal de caja escanea tu código para validar y totalizar tu pedido en el sistema de facturación SIACI.',
      'Tienes derecho a revisar los productos y sus fechas de vencimiento antes de pagar.',
    ],
  },
  {
    category: 'pagos',
    title: '5. Métodos de pago, precios e impuestos',
    intro: `El pago se hace únicamente en caja, al retirar la mercadería en ${STORE_INFO.tradeName}. Aceptamos:`,
    bullets: [
      'Efectivo en dólares de los Estados Unidos de América (USD).',
      'Tarjetas de débito y crédito nacionales e internacionales, sin recargo.',
      'Transferencia bancaria verificada en caja.',
      'Los precios finales incluyen los impuestos de ley (IVA 15 % o tarifa 0 % en productos de la canasta básica).',
      'Se emite factura electrónica autorizada por el Servicio de Rentas Internas (SRI).',
    ],
  },
  {
    category: 'pagos',
    title: '6. Frescura, devoluciones y reclamos',
    intro: 'Conforme a la Ley Orgánica de Defensa del Consumidor del Ecuador:',
    bullets: [
      'Si al retirar en caja un producto no cumple con tus expectativas de frescura o integridad, puedes pedir el cambio inmediato o quitarlo de la cuenta sin penalidad.',
      `Para reclamos posteriores de productos sellados tienes 48 horas, con el comprobante de pago emitido por ${STORE_INFO.tradeName}.`,
      `Disponemos de Libro de Reclamaciones físico en Atención al Cliente y recepción digital en el correo ${STORE_INFO.email}.`,
    ],
  },
];

/** Cláusulas de una pestaña ("todos" devuelve todas, en orden). */
export function clausesFor(category: TermsCategory): TermsClause[] {
  return category === 'todos' ? TERMS_CLAUSES : TERMS_CLAUSES.filter(clause => clause.category === category);
}
