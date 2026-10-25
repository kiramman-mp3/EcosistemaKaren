import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { api } from '../api/client';
import { Button } from './ui/Button';
import { getErrorMessage } from '../utils/errors';

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
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'No pudimos validar tus datos. Revisa el correo y la contraseña.'));
    } finally {
      setLoading(false);
    }
  };

  const field = 'w-full h-12 px-4 rounded-full bg-page border-2 border-transparent font-semibold text-ink placeholder:text-ink-faint focus:bg-surface focus:border-mora focus:outline-none transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-mora/70" onClick={onClose} aria-label="Cerrar" tabIndex={-1} />
      <div role="dialog" aria-modal="true" aria-labelledby="login-title" className="relative w-full max-w-sm rounded-block border-2 border-mora bg-surface overflow-hidden shadow-pop-lg animate-scale-up">
        <div className="bg-limon text-mora border-b-2 border-mora px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="login-title" className="text-3xl leading-none">
              {isRegister ? 'Crea tu cuenta' : 'Hola de nuevo'}
            </h2>
            <p className="mt-2 text-sm font-semibold">
              {isRegister ? 'Con una cuenta puedes apartar y ver tus códigos de retiro.' : 'Ingresa para apartar y ver tus códigos de retiro.'}
            </p>
          </div>
          <button onClick={onClose} className="w-11 h-11 -mr-3 -mt-2 rounded-full flex items-center justify-center hover:bg-mora/10" aria-label="Cerrar inicio de sesión">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p role="alert" className="flex gap-2 rounded-tag bg-karen-tint text-karen-deep text-sm font-semibold p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}
            </p>
          )}
          {isRegister && (
            <label className="block">
              <span className="block text-sm font-bold text-ink mb-1.5">Nombre y apellido</span>
              <input type="text" required autoComplete="name" value={nombre} onChange={e => setNombre(e.target.value)} className={field} />
            </label>
          )}
          <label className="block">
            <span className="block text-sm font-bold text-ink mb-1.5">Correo</span>
            <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="block text-sm font-bold text-ink mb-1.5">Contraseña</span>
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
          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? 'Un momento…' : isRegister ? 'Crear cuenta' : 'Ingresar'}
          </Button>
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
              className="font-extrabold text-ink underline underline-offset-4 decoration-2 decoration-limon"
            >
              {isRegister ? 'Ingresa' : 'Crea una cuenta'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};
