import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// El service worker solo se registra en el build: en desarrollo cachearía módulos de Vite.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
