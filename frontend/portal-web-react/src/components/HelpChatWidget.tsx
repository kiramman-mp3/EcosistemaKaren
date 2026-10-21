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
    response: '¡Es muy fácil! Cuando confirmas tu reserva en la web, generas un Pase de Retiro con un PIN como "KR-XXXXXX" y un código QR. Solo debes acercarte a Caja SIACI en la Sucursal Matriz, mostrar el código a la cajera y pagar tus productos antes de que finalicen los 10 minutos.',
  },
  {
    label: '¿Qué pasa si pasan los 10 minutos?',
    query: 'que pasa si pasan los 10 minutos',
    response: 'Por nuestra política anti-overbooking y respeto a los clientes en tienda, el stock se aparta exactamente por 10 minutos. Si el tiempo expira, los productos vuelven automáticamente a la percha física. No hay multas ni penalizaciones, ¡puedes volver a reservar cuando estés cerca!',
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
    response: 'Si necesitas asistencia personalizada de un cajero o bodeguero, puedes escribir directamente a nuestra línea oficial de WhatsApp:',
    actionUrl: 'https://wa.me/593998765432?text=Hola%20Supermercado%20Karen,%20necesito%20ayuda%20con%20una%20reserva',
    actionLabel: 'Abrir WhatsApp (+593 99 876 5432)',
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
        replyText = 'Las reservas web tienen una duración de 10 minutos. Una vez confirmada en el carrito, dirígete a caja con tu código KR-XXXXXX antes de que el temporizador llegue a cero.';
      } else if (lower.includes('oferta') || lower.includes('descuento') || lower.includes('fefo') || lower.includes('caducidad')) {
        replyText = 'Nuestras ofertas por vencer (FEFO) son lotes auditados con descuentos del 20% al 50%. Tienen la misma calidad garantizada y puedes apartarlas para asegurar tu precio promocional.';
      } else if (lower.includes('pago') || lower.includes('tarjeta') || lower.includes('efectivo') || lower.includes('precio')) {
        replyText = 'El pago se realiza en caja física al momento de retirar tu pedido. Aceptamos efectivo, tarjetas y transferencias.';
      } else if (lower.includes('hola') || lower.includes('buenas') || lower.includes('buenos dias')) {
        replyText = '¡Hola! Un gusto saludarte. ¿En qué podemos orientarte sobre tu compra o reserva en Supermercados Karen?';
      } else if (lower.includes('humano') || lower.includes('asesor') || lower.includes('whatsapp') || lower.includes('telefono')) {
        replyText = 'Con gusto te comunicamos con nuestro equipo de atención humana en WhatsApp:';
        actionUrl = 'https://wa.me/593998765432?text=Hola%20Supermercado%20Karen,%20necesito%20asistencia%20personalizada';
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
    <aside aria-label="Asistente de ayuda KarenBot" className="fixed bottom-5 right-5 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Abrir chat de ayuda en línea"
          className="group flex items-center gap-2.5 rounded-full bg-ink text-white pl-4 pr-5 py-3 shadow-lift hover:bg-ink-soft transition-all transform hover:scale-105"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-karen opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-karen" />
          </span>
          <MessageSquare className="w-5 h-5 text-sticker" />
          <span className="font-semibold text-sm">¿Necesitas ayuda?</span>
        </button>
      )}

      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] max-h-[calc(100vh-6rem)] rounded-2xl bg-white shadow-2xl border border-aisle-rule flex flex-col overflow-hidden animate-scale-up">
          {/* Cabecera del chat */}
          <div className="bg-ink text-white px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-karen flex items-center justify-center font-tag font-bold text-white">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-ink" />
              </div>
              <div>
                <h3 className="font-tag font-bold text-sm flex items-center gap-1.5">
                  KarenBot
                  <span className="text-[10px] bg-karen text-white px-1.5 py-0.2 rounded font-normal">Oficial</span>
                </h3>
                <p className="text-[11px] text-white/70">Asistente en línea · Respuestas al instante</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar chat de ayuda"
              className="w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Área de mensajes con scroll */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-aisle/40 text-xs sm:text-sm">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-karen text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-ink text-white rounded-tr-none'
                      : 'bg-white text-ink border border-aisle-rule rounded-tl-none'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.actionUrl && (
                    <a
                      href={msg.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tag bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors"
                    >
                      <span>{msg.actionLabel || 'Abrir enlace'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <span
                    className={`block mt-1 text-[10px] ${
                      msg.sender === 'user' ? 'text-white/60 text-right' : 'text-ink-muted'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-ink-soft text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2.5 items-center text-xs text-ink-muted">
                <div className="w-7 h-7 rounded-full bg-karen text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white px-3 py-2 rounded-2xl border border-aisle-rule flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Preguntas frecuentes rápidas (chips) */}
          <div className="px-3 py-2 bg-white border-t border-aisle-rule overflow-x-auto no-scrollbar flex gap-1.5 shrink-0">
            {FAQ_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip.label)}
                className="whitespace-nowrap rounded-full bg-aisle hover:bg-karen-tint hover:text-karen border border-aisle-rule px-3 py-1 text-xs text-ink transition-colors shrink-0"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Campo de entrada de texto */}
          <div className="p-3 bg-white border-t border-aisle-rule flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta aquí..."
              className="flex-1 h-10 px-3 rounded-tag bg-aisle border border-aisle-rule text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-karen focus:bg-white transition-colors"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim()}
              aria-label="Enviar mensaje"
              className="w-10 h-10 rounded-tag bg-karen text-white flex items-center justify-center hover:bg-karen-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
