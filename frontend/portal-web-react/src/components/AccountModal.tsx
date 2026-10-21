import React, { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';
import { Button } from './ui/Button';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { nombre: string; email: string } | null;
  onLogout: () => void;
}

/** "Tu cuenta": quién tiene la sesión abierta y cómo cerrarla (el equivalente al modal de cuenta de la app). */
export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, user, onLogout }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-mora/70" onClick={onClose} aria-label="Cerrar" tabIndex={-1} />
      <div role="dialog" aria-modal="true" aria-labelledby="account-title" className="relative w-full max-w-sm rounded-block border-2 border-mora bg-surface overflow-hidden shadow-pop-lg animate-scale-up">
        <div className="bg-limon text-mora border-b-2 border-mora px-6 py-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="account-title" className="text-3xl leading-none">Tu cuenta</h2>
            <p className="mt-2 text-sm font-semibold truncate">{user.email}</p>
          </div>
          <button onClick={onClose} className="w-11 h-11 -mr-3 -mt-2 shrink-0 rounded-full flex items-center justify-center hover:bg-mora/10" aria-label="Cerrar tu cuenta">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-base font-semibold text-ink">Hola, {user.nombre}.</p>
          <Button variant="surface" className="w-full" onClick={onLogout}>
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
};
