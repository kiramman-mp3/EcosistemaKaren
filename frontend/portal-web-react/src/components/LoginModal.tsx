import React, { useState } from 'react';
import { X, User, ArrowRight, Shield, AlertTriangle, Sparkles, UserPlus } from 'lucide-react';
import { api } from '../api/client';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { id: string; nombre: string; email: string; rol?: string }) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const res = await api.register({ nombre, email, password });
        setSuccessMsg('¡Cuenta registrada exitosamente!');
        onLoginSuccess(res.user);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        const res = await api.login({ email, password });
        setSuccessMsg('¡Inicio de sesión exitoso!');
        onLoginSuccess(res.user);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Error en autenticación. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setEmail('cliente@karen.com');
    setPassword('demo123');
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ email: 'cliente@karen.com', password: 'demo123' });
      setSuccessMsg('¡Conectado como Cliente Demo!');
      onLoginSuccess(res.user);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Error con usuario demo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-deep/75 backdrop-blur-sm animate-fade-in">
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
            {isRegister ? <UserPlus className="w-6 h-6" /> : <User className="w-6 h-6" />}
          </div>
          <h3 className="text-xl font-display font-black text-navy">
            {isRegister ? 'Crear Cuenta Karen' : 'Portal Clientes Karen'}
          </h3>
          <p className="text-xs text-slate-500">
            {isRegister
              ? 'Regístrate para reservar productos frescos sin sobreventa'
              : 'Inicia sesión para reservar stock y sincronizar tus compras físicas.'}
          </p>
        </div>

        {/* Demo Fast Login Pill */}
        <div className="mb-5 p-3 bg-red-50/80 border border-red-100 rounded-2xl flex items-center justify-between">
          <div className="text-left">
            <span className="text-[11px] font-bold text-karenRed block">¿Prueba rápida?</span>
            <span className="text-[10px] text-slate-500">Acceso con cuenta de prueba</span>
          </div>
          <button
            type="button"
            onClick={handleQuickDemo}
            disabled={loading}
            className="px-3 py-1.5 bg-karenRed hover:bg-karenRed-hover text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1 active:scale-95"
          >
            <Sparkles className="w-3 h-3" />
            <span>Demo 1-Click</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg ? (
          <div className="py-6 text-center text-emerald-600 font-bold space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 mx-auto flex items-center justify-center">
              ✓
            </div>
            <p className="text-sm">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Laura Morales"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                placeholder="cliente@karen.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm text-white bg-navy hover:bg-navy-dark transition-all flex items-center justify-center gap-2 shadow-soft disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>{isRegister ? 'Registrarme' : 'Acceder al Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                }}
                className="text-xs text-navy font-bold hover:underline"
              >
                {isRegister
                  ? '¿Ya tienes cuenta? Inicia sesión aquí'
                  : '¿No tienes cuenta? Regístrate aquí'}
              </button>
            </div>

            <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1 mt-2">
              <Shield className="w-3.5 h-3.5" />
              <span>Conexión segura garantizada con JWT</span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
