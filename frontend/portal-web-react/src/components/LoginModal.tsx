import React, { useState } from 'react';
import { X, User, ArrowRight, Shield } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogged, setIsLogged] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLogged(true);
    setTimeout(() => {
      setIsLogged(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-deep/70 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          aria-label="Cerrar modal de inicio de sesión"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-navy/10 text-navy flex items-center justify-center mx-auto">
            <User className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-display font-black text-navy">
            Portal Clientes Karen
          </h3>
          <p className="text-xs text-slate-500">
            Inicia sesión para guardar tus listas y ver tu historial de reservas.
          </p>
        </div>

        {isLogged ? (
          <div className="py-6 text-center text-emerald-600 font-bold space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 mx-auto flex items-center justify-center">
              ✓
            </div>
            <p className="text-sm">¡Sesión iniciada correctamente!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="ejemplo@karen.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-bold text-sm text-white bg-navy hover:bg-navy-dark transition-all flex items-center justify-center gap-2 shadow-soft"
            >
              <span>Acceder al Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1 mt-2">
              <Shield className="w-3.5 h-3.5" />
              <span>Conexión segura garantizada</span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
