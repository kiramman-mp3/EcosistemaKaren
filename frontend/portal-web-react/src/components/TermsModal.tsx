import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  Clock,
  Ticket,
  AlertCircle,
  FileText,
  Lock,
  CreditCard,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSection?: string;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<'todos' | 'privacidad' | 'reservas' | 'fefo' | 'pagos'>('todos');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-mora/70 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-title"
    >
      <div className="relative w-full max-w-3xl rounded-block bg-surface shadow-pop-lg border-2 border-mora overflow-hidden my-6 animate-scale-up flex flex-col max-h-[90vh]">
        {/* Encabezado del modal */}
        <div className="bg-limon text-mora px-6 py-5 border-b-2 border-mora flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full border-2 border-mora bg-surface text-mora flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 id="terms-title" className="font-display font-extrabold text-2xl text-mora leading-tight">
                Términos y Condiciones del Servicio
              </h2>
              <p className="text-xs font-semibold text-mora/80">
                Supermercados Karen S.A. · RUC 0992345678001 · Guayaquil, Ecuador · Actualizado 2026
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar términos y condiciones"
            className="w-10 h-10 rounded-full bg-surface border-2 border-mora text-mora hover:bg-mora hover:text-white flex items-center justify-center transition-colors shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de pestañas / filtro rápido */}
        <div className="bg-page px-6 py-3 border-b-2 border-aisle-rule flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs">
          <button
            onClick={() => setActiveCategory('todos')}
            className={`px-3.5 py-1.5 rounded-full font-bold border-2 border-transparent transition-colors shrink-0 ${
              activeCategory === 'todos'
                ? 'bg-limon text-mora border-2 border-mora'
                : 'bg-surface text-ink-soft border-2 border-aisle-rule hover:bg-aisle-rule'
            }`}
          >
            Todas las Políticas
          </button>
          <button
            onClick={() => setActiveCategory('privacidad')}
            className={`px-3.5 py-1.5 rounded-full font-bold border-2 border-transparent transition-colors shrink-0 flex items-center gap-1 ${
              activeCategory === 'privacidad'
                ? 'bg-limon text-mora border-2 border-mora'
                : 'bg-surface text-ink-soft border-2 border-aisle-rule hover:bg-aisle-rule'
            }`}
          >
            <Lock className="w-3 h-3" />
            Privacidad & LOPDP
          </button>
          <button
            onClick={() => setActiveCategory('reservas')}
            className={`px-3.5 py-1.5 rounded-full font-bold border-2 border-transparent transition-colors shrink-0 flex items-center gap-1 ${
              activeCategory === 'reservas'
                ? 'bg-limon text-mora border-2 border-mora'
                : 'bg-surface text-ink-soft border-2 border-aisle-rule hover:bg-aisle-rule'
            }`}
          >
            <Clock className="w-3 h-3" />
            Reservas & TTL (30 min)
          </button>
          <button
            onClick={() => setActiveCategory('fefo')}
            className={`px-3.5 py-1.5 rounded-full font-bold border-2 border-transparent transition-colors shrink-0 flex items-center gap-1 ${
              activeCategory === 'fefo'
                ? 'bg-limon text-mora border-2 border-mora'
                : 'bg-surface text-ink-soft border-2 border-aisle-rule hover:bg-aisle-rule'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            FEFO & Semáforo
          </button>
          <button
            onClick={() => setActiveCategory('pagos')}
            className={`px-3.5 py-1.5 rounded-full font-bold border-2 border-transparent transition-colors shrink-0 flex items-center gap-1 ${
              activeCategory === 'pagos'
                ? 'bg-limon text-mora border-2 border-mora'
                : 'bg-surface text-ink-soft border-2 border-aisle-rule hover:bg-aisle-rule'
            }`}
          >
            <CreditCard className="w-3 h-3" />
            Pagos & Retiro SIACI
          </button>
        </div>

        {/* Cuerpo con las cláusulas detalladas */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-sm text-ink-soft leading-relaxed flex-1">
          {/* Bienvenida & Resumen General */}
          <div className="bg-karen-tint/30 rounded-xl p-4 border border-karen/20 flex gap-3 text-ink">
            <ShieldCheck className="w-5 h-5 text-karen-text shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm">
              Bienvenido al <strong>Portal Digital de Supermercados Karen</strong>. Este servicio omnicanal le permite reservar productos desde su computadora o teléfono celular y retirarlos presencialmente en el área de <strong>Caja SIACI</strong> de nuestra sucursal.
            </p>
          </div>

          {/* 1. Política de Reserva y TTL 30 Minutos */}
          {(activeCategory === 'todos' || activeCategory === 'reservas') && (
            <section className="space-y-2.5 p-4 rounded-xl bg-aisle/40 border border-aisle-rule">
              <h3 className="font-display font-extrabold text-base text-ink flex items-center gap-2">
                <Clock className="w-4 h-4 text-karen-text shrink-0" />
                1. Política de Reserva y Tiempo de Tolerancia (TTL de 30 Minutos)
              </h3>
              <p>
                Para garantizar la disponibilidad real y evitar la sobreventa cruzada entre compras digitales y clientes presenciales en percha, cada reserva confirmada aparta el stock físico por un <strong>plazo improrrogable de treinta (30) minutos reloj</strong> contados a partir de su emisión en el servidor (ADR-001).
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-ink-soft">
                <li>El temporizador regresivo se visualiza en tiempo real en su <em>Pase de Retiro Digital</em>.</li>
                <li>Si el cliente no se presenta en caja antes del vencimiento del tiempo de tolerancia (30 minutos), el sistema informático sweeper liberará automáticamente el stock reservado, retornándolo de inmediato a la percha física.</li>
                <li><strong>Cero penalizaciones:</strong> La expiración de una reserva no genera multas, penalizaciones ni cobros al usuario. Podrá realizar una nueva reserva en cualquier momento según disponibilidad.</li>
              </ul>
            </section>
          )}

          {/* 2. Protección de Datos y Privacidad */}
          {(activeCategory === 'todos' || activeCategory === 'privacidad') && (
            <section className="space-y-2.5 p-4 rounded-xl bg-aisle/40 border border-aisle-rule">
              <h3 className="font-display font-extrabold text-base text-ink flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                2. Política de Privacidad y Protección de Datos Personales (LOPDP Ecuador)
              </h3>
              <p>
                De conformidad con la <strong>Ley Orgánica de Protección de Datos Personales (LOPDP)</strong> de la República del Ecuador, Supermercados Karen S.A. garantiza la confidencialidad, integridad y uso estrictamente autorizado de la información de sus usuarios:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-ink-soft">
                <li>
                  <strong>Datos recopilados:</strong> Nombre completo, correo electrónico, registro de pedidos y consultas realizadas al asistente virtual KarenBot.
                </li>
                <li>
                  <strong>Finalidad legítima:</strong> Los datos se utilizan única y exclusivamente para gestionar sus reservas en línea, la verificación de identidad en caja, el soporte al cliente y la emisión de comprobantes autorizados por el Servicio de Rentas Internas (SRI).
                </li>
                <li>
                  <strong>No comercialización:</strong> Supermercados Karen <strong>no comercializa, no alquila ni comparte</strong> sus datos personales con terceras partes o empresas de marketing.
                </li>
                <li>
                  <strong>Derechos ARCO:</strong> El titular puede ejercer en todo momento sus derechos de Acceso, Rectificación, Cancelación u Oposición escribiendo a <em>privacidad@karen.com.ec</em> o acudiendo a Atención al Cliente.
                </li>
                <li>
                  <strong>Cookies y almacenamiento local:</strong> El portal web utiliza almacenamiento local de sesión técnica exclusivamente para conservar su carrito de compra y preferencia de tema (claro/oscuro), sin rastreadores invasivos de publicidad de terceros.
                </li>
              </ul>
            </section>
          )}

          {/* 3. Sistema FEFO y Semáforo de Caducidad */}
          {(activeCategory === 'todos' || activeCategory === 'fefo') && (
            <section className="space-y-2.5 p-4 rounded-xl bg-aisle/40 border border-aisle-rule">
              <h3 className="font-display font-extrabold text-base text-ink flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                3. Sistema FEFO y Precios de Oferta Flash
              </h3>
              <p>
                Supermercados Karen opera bajo el estándar <strong>FEFO (*First Expired, First Out*)</strong> con el fin de evitar el desperdicio de alimentos y asegurar la máxima frescura de los lotes en tienda.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 my-2 text-xs">
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-900">
                  <span className="font-bold block">🔴 Semáforo Rojo (1–6 días)</span>
                  Ofertas Flash agresivas para lotes próximos a vencer.
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                  <span className="font-bold block">🟡 Semáforo Amarillo (7–14 días)</span>
                  Rotación preventiva con precios de descuento preferencial.
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <span className="font-bold block">🟢 Semáforo Verde (≥ 15 días)</span>
                  Mercadería regular con caducidad estándar garantizada.
                </div>
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-ink-soft">
                <li>Los productos en promoción especial u oferta flash corresponden a lotes con fechas de vencimiento próximas pero plenamente aptos y garantizados para consumo humano. Los lotes de 0 días o menos se descartan automáticamente como merma y jamás salen a la venta.</li>
                <li>La fecha de caducidad exacta de cada lote se informa de forma transparente en la etiqueta del producto y en la ficha del portal digital.</li>
                <li>Los descuentos generados con asistencia de Inteligencia Artificial (Google Gemini) son formalmente auditados y aprobados por la Gerencia de Tienda.</li>
              </ul>
            </section>
          )}

          {/* 4. Retiro en Caja SIACI */}
          {(activeCategory === 'todos' || activeCategory === 'pagos') && (
            <section className="space-y-2.5 p-4 rounded-xl bg-aisle/40 border border-aisle-rule">
              <h3 className="font-display font-extrabold text-base text-ink flex items-center gap-2">
                <Ticket className="w-4 h-4 text-karen-text shrink-0" />
                4. Procedimiento de Retiro en Caja SIACI
              </h3>
              <p>
                Al llegar a la Sucursal Matriz, acérquese al área de cajas e indique al cajero que posee una reserva web:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-ink-soft">
                <li>Presente el <strong>Código de Retiro alfanumérico (formato KR-XXXXXX)</strong> o muestre el <strong>código QR</strong> en la pantalla de su dispositivo móvil.</li>
                <li>El personal de caja escaneará su código para validar y totalizar su pedido de manera instantánea en el sistema de facturación SIACI.</li>
                <li><strong>Inspección previa:</strong> El cliente tiene pleno derecho a inspeccionar visualmente los productos y fechas de vencimiento antes de realizar el pago definitivo.</li>
              </ul>
            </section>
          )}

          {/* 5. Métodos de Pago e Impuestos SRI */}
          {(activeCategory === 'todos' || activeCategory === 'pagos') && (
            <section className="space-y-2.5 p-4 rounded-xl bg-aisle/40 border border-aisle-rule">
              <h3 className="font-display font-extrabold text-base text-ink flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-karen-text shrink-0" />
                5. Métodos de Pago, Precios e Impuestos
              </h3>
              <p>
                El pago se efectúa exclusivamente en caja al retirar la mercadería en la Sucursal Matriz. Aceptamos:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-ink-soft">
                <li>Efectivo en Dólares de los Estados Unidos de América (USD $).</li>
                <li>Tarjetas de débito y crédito nacionales e internacionales sin ningún recargo adicional.</li>
                <li>Transferencia bancaria directa verificada en caja.</li>
                <li>Los precios finales incluyen los impuestos de ley vigentes en la República del Ecuador (IVA 15% o tarifa 0% para productos de la canasta básica familiar).</li>
                <li>Se emitirá factura electrónica oficial autorizada por el Servicio de Rentas Internas (SRI).</li>
              </ul>
            </section>
          )}

          {/* 6. Garantía de Calidad y Devoluciones */}
          {(activeCategory === 'todos' || activeCategory === 'pagos') && (
            <section className="space-y-2.5 p-4 rounded-xl bg-aisle/40 border border-aisle-rule">
              <h3 className="font-display font-extrabold text-base text-ink flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-emerald-600 shrink-0" />
                6. Garantía de Frescura, Devoluciones y Libro de Reclamaciones
              </h3>
              <p>
                Conforme a la Ley Orgánica de Defensa del Consumidor del Ecuador:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-ink-soft">
                <li>Si al momento del retiro en caja algún producto no cumple con sus expectativas de frescura o integridad, podrá solicitar el cambio inmediato o retirar el ítem de la cuenta sin penalidad alguna.</li>
                <li>Para reclamos posteriores de productos sellados, dispone de 48 horas con el comprobante de pago emitido por Supermercados Karen.</li>
                <li>Disponemos de Libro de Reclamaciones físico en nuestro módulo de Atención al Cliente y recepción digital mediante el correo <em>atencion@karen.com.ec</em>.</li>
              </ul>
            </section>
          )}
        </div>

        {/* Pie del modal con botón de confirmación */}
        <div className="bg-aisle px-6 py-4 border-t border-aisle-rule flex items-center justify-between gap-4 shrink-0">
          <span className="text-xs text-ink-muted hidden sm:inline">
            Presione Escape o haga clic en Entendido para continuar.
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto h-11 px-8 rounded-tag bg-mora text-white font-semibold hover:bg-karen transition-colors shadow-sm"
          >
            Entendido y Acepto
          </button>
        </div>
      </div>
    </div>
  );
};

