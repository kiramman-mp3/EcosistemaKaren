import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
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

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = isRegister
        ? await api.register({ nombre, email, password })
        : await api.login({ email, password });
      onLoginSuccess(res.user);
      setPassword('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'No pudimos validar tus datos. Revisa el correo y la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const field = 'w-full h-11 px-3 rounded-tag bg-surface border border-aisle-strong text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-ink/60" onClick={onClose} aria-label="Cerrar" tabIndex={-1} />
      <div role="dialog" aria-modal="true" aria-labelledby="login-title" className="relative w-full max-w-sm rounded-tag bg-surface overflow-hidden animate-slide-up">
        <div className="bg-ink px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="login-title" className="font-display font-extrabold text-2xl text-white">
              {isRegister ? 'Crea tu cuenta' : 'Ingresa a tu cuenta'}
            </h2>
            <p className="mt-1 text-sm text-white/75">
              {isRegister ? 'Con una cuenta puedes reservar y ver tus códigos de retiro.' : 'Para reservar y ver tus códigos de retiro.'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-white/70 hover:text-white" aria-label="Cerrar inicio de sesión">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p role="alert" className="flex gap-2 rounded-tag bg-karen-tint text-karen-deep text-sm p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}
            </p>
          )}
          {isRegister && (
            <label className="block">
              <span className="block text-sm font-semibold text-ink mb-1">Nombre y apellido</span>
              <input type="text" required autoComplete="name" value={nombre} onChange={e => setNombre(e.target.value)} className={field} />
            </label>
          )}
          <label className="block">
            <span className="block text-sm font-semibold text-ink mb-1">Correo</span>
            <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-ink mb-1">Contraseña</span>
            <input
              type="password"
              required
              minLength={isRegister ? 8 : undefined}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={field}
            />
            {isRegister && <span className="mt-1 block text-xs text-ink-muted">Mínimo 8 caracteres.</span>}
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-tag bg-karen text-white font-semibold hover:bg-karen-deep disabled:opacity-60"
          >
            {loading ? 'Un momento…' : isRegister ? 'Crear cuenta' : 'Ingresar'}
          </button>
          {isRegister && (
            <p className="text-[11px] text-ink-muted text-center leading-normal">
              Al registrarte aceptas los <strong>Términos y Condiciones</strong> y la <strong>Política de Privacidad</strong> (LOPDP Ecuador).
            </p>
          )}
          <p className="text-center text-sm text-ink-soft">
            {isRegister ? '¿Ya tienes cuenta?' : '¿Primera vez aquí?'}{' '}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(null); }}
              className="font-semibold text-ink underline underline-offset-2"
            >
              {isRegister ? 'Ingresa' : 'Crea una cuenta'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};
