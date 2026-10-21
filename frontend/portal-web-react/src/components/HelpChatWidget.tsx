import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, ExternalLink } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  actionUrl?: string;
  actionLabel?: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-welcome',
    sender: 'bot',
    text: '¡Hola! Soy KarenBot, tu asistente virtual de Supermercados Karen. ¿En qué te puedo ayudar hoy con tus reservas u ofertas?',
    timestamp: 'Ahora',
  },
];

const FAQ_CHIPS = [
  {
    label: '¿Cómo retiro con mi código KR?',
    query: 'como retiro con el codigo',
    response: '¡Es muy fácil! Cuando confirmas tu reserva en la web, generas un Pase de Retiro con un PIN como "KR-XXXXXX" y un código QR. Solo debes acercarte a Caja SIACI en la Sucursal Matriz, mostrar el código a la cajera y pagar tus productos antes de que finalicen los 30 minutos.',
  },
  {
    label: '¿Qué pasa si pasan los 30 minutos?',
    query: 'que pasa si pasan los 30 minutos',
    response: 'Por nuestra política anti-overbooking y respeto a los clientes en tienda, el stock se aparta exactamente por 30 minutos. Si el tiempo expira, los productos vuelven automáticamente a la percha física. No hay multas ni penalizaciones, ¡puedes volver a reservar cuando estés cerca!',
  },
  {
    label: '¿Qué formas de pago aceptan?',
    query: 'formas de pago aceptadas',
    response: 'En Caja SIACI aceptamos Efectivo (USD), todas las tarjetas de Débito y Crédito (Visa, Mastercard, Diners, American Express) y Transferencia bancaria directa verificada al instante.',
  },
  {
    label: 'Horarios y ubicación de la tienda',
    query: 'horarios y ubicacion',
    response: 'Nuestra Sucursal Matriz está ubicada en Av. Principal y Calle 4ta, Guayaquil. Atendemos de Lunes a Sábado de 07:00 a 21:00 y Domingos o Feriados de 08:00 a 19:00.',
  },
  {
    label: '📲 Hablar con un asesor en WhatsApp',
    query: 'whatsapp asesor humano',
    response: 'Si necesitas asistencia personalizada, puedes escribir directamente a nuestra línea oficial de WhatsApp:',
    actionUrl: 'https://wa.me/593983553724?text=Hola%20Supermercado%20Karen,%20necesito%20ayuda%20con%20una%20reserva',
    actionLabel: 'Abrir WhatsApp (+593 98 355 3724)',
  },
];

export const HelpChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    // Búsqueda de respuesta automática inteligente
    setTimeout(() => {
      const lower = text.toLowerCase();
      let replyText = 'Gracias por escribirnos. Para consultas específicas sobre productos o reservas especiales, te recomendamos contactar directamente a nuestro personal de atención en tienda.';
      let actionUrl: string | undefined;
      let actionLabel: string | undefined;

      const matchedFaq = FAQ_CHIPS.find(faq =>
        lower.includes(faq.query) || lower.includes(faq.label.toLowerCase().slice(0, 15))
      );

      if (matchedFaq) {
        replyText = matchedFaq.response;
        actionUrl = matchedFaq.actionUrl;
        actionLabel = matchedFaq.actionLabel;
      } else if (lower.includes('reserva') || lower.includes('tiempo') || lower.includes('minuto') || lower.includes('ttl')) {
        replyText = 'Las reservas web tienen una duración de 30 minutos. Una vez confirmada en el carrito, dirígete a caja con tu código KR-XXXXXX antes de que el temporizador llegue a cero.';
      } else if (lower.includes('oferta') || lower.includes('descuento') || lower.includes('fefo') || lower.includes('caducidad')) {
        replyText = 'Nuestras ofertas por vencer (FEFO) son lotes auditados con descuentos del 20% al 50%. Tienen la misma calidad garantizada y puedes apartarlas para asegurar tu precio promocional.';
      } else if (lower.includes('pago') || lower.includes('tarjeta') || lower.includes('efectivo') || lower.includes('precio')) {
        replyText = 'El pago se realiza en caja física al momento de retirar tu pedido. Aceptamos efectivo, tarjetas y transferencias.';
      } else if (lower.includes('hola') || lower.includes('buenas') || lower.includes('buenos dias')) {
        replyText = '¡Hola! Un gusto saludarte. ¿En qué podemos orientarte sobre tu compra o reserva en Supermercados Karen?';
      } else if (lower.includes('humano') || lower.includes('asesor') || lower.includes('whatsapp') || lower.includes('telefono')) {
        replyText = 'Con gusto te comunicamos con nuestro equipo de atención humana en WhatsApp:';
        actionUrl = 'https://wa.me/593983553724?text=Hola%20Supermercado%20Karen,%20necesito%20asistencia%20personalizada';
        actionLabel = 'Contactar a Asesor por WhatsApp';
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionUrl,
        actionLabel,
      };

      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <aside aria-label="Asistente de ayuda KarenBot" className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 sm:bottom-5 sm:right-5 z-[45]">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Abrir chat de ayuda en línea"
          className="press flex items-center justify-center gap-2.5 rounded-full border-2 border-mora bg-limon text-mora w-12 h-12 sm:w-auto sm:h-auto sm:pl-4 sm:pr-5 sm:py-3"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="hidden sm:inline font-display font-extrabold text-sm">¿Necesitas ayuda?</span>
        </button>
      )}

      {isOpen && (
        <div className="w-[360px] sm:w-[400px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100dvh-9rem)] sm:max-h-[calc(100dvh-6rem)] rounded-block bg-surface shadow-pop-lg border-2 border-mora flex flex-col overflow-hidden animate-scale-up">
          {/* Cabecera del chat */}
          <div className="bg-limon text-mora border-b-2 border-mora px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full border-2 border-mora bg-karen flex items-center justify-center text-white">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-aguacate-solid ring-2 ring-limon" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-base flex items-center gap-1.5">
                  KarenBot
                  <span className="text-[10px] bg-mora text-white px-2 py-0.5 rounded-full font-bold">Oficial</span>
                </h3>
                <p className="text-xs font-semibold">Te respondo al instante</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar chat de ayuda"
              className="w-11 h-11 rounded-full hover:bg-mora/10 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Área de mensajes con scroll */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-page text-sm">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-8 h-8 rounded-full border-2 border-mora bg-karen text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-2.5 leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-karen text-white rounded-tr-sm font-semibold'
                      : 'bg-surface text-ink border-2 border-aisle-rule rounded-tl-sm'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.actionUrl && (
                    <a
                      href={msg.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-mora bg-aguacate-solid text-white font-extrabold text-xs press"
                    >
                      <span>{msg.actionLabel || 'Abrir enlace'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <span
                    className={`block mt-1 text-[10px] ${
                      msg.sender === 'user' ? 'text-white/80 text-right' : 'text-ink-muted'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full border-2 border-mora bg-limon text-mora flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2.5 items-center text-xs text-ink-muted">
                <div className="w-8 h-8 rounded-full border-2 border-mora bg-karen text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-surface px-4 py-3 rounded-2xl rounded-tl-sm border-2 border-aisle-rule flex items-center gap-1.5" role="status" aria-label="KarenBot está escribiendo">
                  <span className="w-2 h-2 bg-karen rounded-full animate-typing-dot" />
                  <span className="w-2 h-2 bg-karen rounded-full animate-typing-dot [animation-delay:0.15s]" />
                  <span className="w-2 h-2 bg-karen rounded-full animate-typing-dot [animation-delay:0.3s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Preguntas frecuentes rápidas (chips) */}
          <div
            role="group"
            aria-label="Preguntas frecuentes"
            className="px-3 py-2.5 bg-surface border-t-2 border-aisle-rule overflow-x-auto no-scrollbar flex gap-2 sm:flex-wrap sm:overflow-x-visible sm:overflow-y-auto sm:max-h-28 shrink-0"
          >
            {FAQ_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip.label)}
                className="shrink-0 rounded-full bg-surface hover:bg-limon hover:text-mora hover:border-mora border-2 border-aisle-rule px-3.5 py-2 text-left text-xs font-bold text-ink transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Campo de entrada de texto */}
          <div className="p-3 bg-surface border-t-2 border-aisle-rule flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta aquí..."
              className="flex-1 min-w-0 h-11 px-4 rounded-full bg-page border-2 border-transparent text-base sm:text-sm font-semibold text-ink placeholder:text-ink-muted placeholder:font-normal focus:outline-none focus:border-mora focus:bg-surface transition-colors"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim()}
              aria-label="Enviar mensaje"
              className="press w-11 h-11 rounded-full border-2 border-mora bg-karen text-white flex items-center justify-center disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
