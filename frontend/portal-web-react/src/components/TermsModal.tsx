import React, { useEffect } from 'react';
import { X, ShieldCheck, Clock, Ticket, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
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
      className="fixed inset-0 z-[70] bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-title"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-lift border border-aisle-rule overflow-hidden my-8 animate-scale-up">
        {/* Encabezado del modal */}
        <div className="bg-aisle px-6 py-5 border-b border-aisle-rule flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-karen-tint text-karen flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 id="terms-title" className="font-tag font-bold text-xl text-ink">
                Términos y Condiciones del Servicio
              </h2>
              <p className="text-xs text-ink-soft">
                Supermercados Karen · Sucursal Matriz (Ecuador) · Actualizado 2026
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar términos y condiciones"
            className="w-9 h-9 rounded-full bg-white border border-aisle-rule text-ink hover:bg-ink hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo con las cláusulas detalladas */}
        <div className="p-6 sm:p-8 max-h-[65vh] overflow-y-auto space-y-6 text-sm text-ink-soft leading-relaxed">
          <div className="bg-karen-tint/30 rounded-xl p-4 border border-karen/20 flex gap-3 text-ink">
            <ShieldCheck className="w-5 h-5 text-karen shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm">
              Bienvenido al <strong>Portal Digital de Supermercados Karen</strong>. Este servicio omnicanal le permite reservar productos desde su computadora o teléfono celular y retirarlos presencialmente en el área de <strong>Caja SIACI</strong> de nuestra sucursal.
            </p>
          </div>

          <section className="space-y-2">
            <h3 className="font-tag font-bold text-base text-ink flex items-center gap-2">
              <Clock className="w-4 h-4 text-karen" />
              1. Política de Reserva y Tiempo de Tolerancia (TTL de 10 Minutos)
            </h3>
            <p>
              Para garantizar la disponibilidad real y evitar la sobreventa cruzada entre compras digitales y clientes presenciales en percha, cada reserva confirmada aparta el stock físico por un <strong>plazo improrrogable de diez (10) minutos reloj</strong> contados a partir de su emisión.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-ink-soft">
              <li>El temporizador regresivo se visualiza en su <em>Pase de Retiro Digital</em>.</li>
              <li>Si el cliente no se presenta en caja antes del vencimiento del tiempo de tolerancia, el sistema informático liberará automáticamente el stock reservado, retornándolo de inmediato a la percha física.</li>
              <li>La expiración de una reserva no genera multas, penalizaciones ni cargos al usuario.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-tag font-bold text-base text-ink flex items-center gap-2">
              <Ticket className="w-4 h-4 text-karen" />
              2. Procedimiento de Retiro en Caja SIACI
            </h3>
            <p>
              Al llegar a la Sucursal Matriz, acérquese al área de cajas e indique al cajero que posee una reserva web:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-ink-soft">
              <li>Presente el <strong>Código de Retiro alfanumérico (formato KR-XXXXXX)</strong> o muestre el <strong>código QR</strong> en la pantalla de su dispositivo móvil.</li>
              <li>El personal de caja escaneará su código para validar y totalizar su pedido de manera instantánea.</li>
              <li>El cliente tiene derecho a inspeccionar visualmente los productos antes de realizar el pago definitivo.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-tag font-bold text-base text-ink flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-karen" />
              3. Sistema FEFO y Precios de Oferta Flash
            </h3>
            <p>
              Supermercados Karen opera bajo el estándar <strong>FEFO (*First Expired, First Out*)</strong> con el fin de evitar el desperdicio de alimentos.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-ink-soft">
              <li>Los productos en promoción especial u oferta flash corresponden a lotes con fechas de vencimiento próximas pero plenamente aptos y garantizados para consumo humano.</li>
              <li>La fecha de caducidad de cada lote se informa de forma transparente en la etiqueta del producto.</li>
              <li>Los descuentos generados con asistencia de Inteligencia Artificial (Google Gemini) han sido formalmente auditados y aprobados por la Gerencia de Tienda.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-tag font-bold text-base text-ink flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-karen" />
              4. Métodos de Pago e Impuestos
            </h3>
            <p>
              El pago se efectúa exclusivamente en caja al retirar la mercadería. Aceptamos:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-ink-soft">
              <li>Efectivo en Dólares de los Estados Unidos de América (USD $).</li>
              <li>Tarjetas de débito y crédito nacionales e internacionales sin recargo.</li>
              <li>Transferencia bancaria directa verificada en caja.</li>
              <li>Los precios finales incluyen los impuestos de ley vigentes en la República del Ecuador (IVA 15% o tarifa 0% para productos de canasta básica familiar).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-tag font-bold text-base text-ink">
              5. Protección de Datos y Privacidad
            </h3>
            <p>
              De conformidad con la Ley Orgánica de Protección de Datos Personales de Ecuador, la información recopilada (nombre, correo electrónico y registro de pedidos) se utiliza con el único propósito de gestionar sus reservas y facturación. Supermercados Karen no comercializa ni comparte sus datos con terceros.
            </p>
          </section>
        </div>

        {/* Pie del modal con botón de confirmación */}
        <div className="bg-aisle px-6 py-4 border-t border-aisle-rule flex items-center justify-between gap-4">
          <span className="text-xs text-ink-muted hidden sm:inline">
            Presione Escape o haga clic en Cerrar para continuar.
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto h-11 px-8 rounded-tag bg-ink text-white font-semibold hover:bg-ink-soft transition-colors"
          >
            Entendido y Acepto
          </button>
        </div>
      </div>
    </div>
  );
};
