import { describe, expect, it } from 'vitest';
import { getErrorCode, getErrorMessage, getErrorStatus, getServerMessage } from './errors';

const httpError = (status: number, message?: string) => ({ message: 'Request failed', response: { status, data: { message } } });

describe('errores', () => {
  it('prefiere el mensaje que envió el backend', () => {
    expect(getErrorMessage(httpError(409, 'El correo ya está registrado.'), 'Falló')).toBe('El correo ya está registrado.');
    expect(getServerMessage(httpError(409, 'El correo ya está registrado.'))).toBe('El correo ya está registrado.');
  });

  it('usa el mensaje del error cuando no hay respuesta del backend', () => {
    expect(getErrorMessage(new Error('Network Error'), 'Falló')).toBe('Network Error');
    expect(getServerMessage(new Error('Network Error'))).toBeUndefined();
  });

  it('cae en el texto de respaldo con valores inesperados', () => {
    for (const value of [undefined, null, 'texto', 42, {}, { message: '   ' }]) {
      expect(getErrorMessage(value, 'Falló')).toBe('Falló');
    }
  });

  it('ignora un mensaje del backend vacío y usa el del error', () => {
    expect(getErrorMessage(httpError(500, '  '), 'Falló')).toBe('Request failed');
  });

  it('expone el código HTTP solo si es numérico', () => {
    expect(getErrorStatus(httpError(504))).toBe(504);
    expect(getErrorStatus({ response: { status: '504' } })).toBeUndefined();
    expect(getErrorStatus(new Error('x'))).toBeUndefined();
    expect(getErrorStatus(null)).toBeUndefined();
  });

  it('expone el tipo de error que informa el backend', () => {
    expect(getErrorCode({ response: { status: 503, data: { error: 'GeminiNotConfigured' } } })).toBe('GeminiNotConfigured');
    expect(getErrorCode({ response: { status: 503, data: { error: '' } } })).toBeUndefined();
    expect(getErrorCode(new Error('x'))).toBeUndefined();
  });
});
