import { FAQ_CHIPS, replyTo } from './karenBot';

describe('replyTo', () => {
  it('responde cada pregunta frecuente con su texto', () => {
    for (const chip of FAQ_CHIPS) {
      expect(replyTo(chip.label).text).toBe(chip.text);
    }
  });

  it('ofrece el enlace de WhatsApp en el chip del asesor', () => {
    const reply = replyTo('Hablar con un asesor en WhatsApp');
    expect(reply.actionUrl).toMatch(/^https:\/\/wa\.me\/593983553724\?text=/);
    expect(reply.actionLabel).toBeTruthy();
  });

  it('reconoce palabras clave en mensajes libres', () => {
    expect(replyTo('cuanto dura mi reserva').text).toContain('10 minutos');
    expect(replyTo('hay descuentos?').text).toContain('FEFO');
    expect(replyTo('aceptan tarjeta').text).toContain('caja');
    expect(replyTo('quiero hablar con un humano').actionUrl).toContain('wa.me');
  });

  it('cae en una respuesta genérica cuando no entiende', () => {
    const reply = replyTo('xyz');
    expect(reply.text).toContain('Gracias por escribirnos');
    expect(reply.actionUrl).toBeUndefined();
  });
});
