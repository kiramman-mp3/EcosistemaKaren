const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
    if (this.apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(this.apiKey);
        this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      } catch (err) {
        console.warn('⚠️ No se pudo inicializar GoogleGenerativeAI SDK, se usará fallback local:', err.message);
        this.model = null;
      }
    }
  }

  async generarEstrategiaPromocional({ loteId, numeroLote, productoNombre, diasParaVencer, cantidadDisponible, ubicacion }) {
    // Si tenemos clave y SDK configurado
    if (this.ai && this.apiKey) {
      try {
        const prompt = `Actúa como el Gerente Comercial de Supermercado Karen. 
Tenemos el lote '${numeroLote}' del producto '${productoNombre}' con ${cantidadDisponible} unidades en '${ubicacion}'. 
Le quedan exactamente ${diasParaVencer} días para caducar.
Genera una estrategia de descuento y una frase promocional persuasiva para acelerar la rotación de este lote antes de que expire.
Responde ÚNICAMENTE en formato JSON plano con la siguiente estructura exacta:
{
  "descuentoPorcentaje": 35,
  "frasePromocional": "¡Oferta Relámpago! 35% de descuento en Yogurt Griego 500g.",
  "razonIa": "Lote con 4 días para caducar con 45 unidades disponibles."
}`;

        const response = await this.model.generateContent(prompt);
        const text = response.response.text() || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            loteId,
            descuentoPorcentaje: parsed.descuentoPorcentaje || this.calcularDescuentoFallback(diasParaVencer),
            frasePromocional: parsed.frasePromocional || `¡Descuento por caducidad cercana en ${productoNombre}!`,
            razonIa: parsed.razonIa || `Generado por Gemini AI para lote con ${diasParaVencer} días restantes.`
          };
        }
      } catch (error) {
        console.error('⚠️ Error al llamar a la API de Gemini, utilizando estrategia fallback local:', error.message);
      }
    }

    // Fallback determinístico basado en reglas de negocio locales
    const desc = this.calcularDescuentoFallback(diasParaVencer);
    return {
      loteId,
      descuentoPorcentaje: desc,
      frasePromocional: `¡Oferta Especial! ${desc}% de descuento en ${productoNombre} por pronta caducidad.`,
      razonIa: `Fallback local: Lote '${numeroLote}' con ${diasParaVencer} días para vencer y ${cantidadDisponible} unidades en ${ubicacion}.`
    };
  }

  calcularDescuentoFallback(diasParaVencer) {
    if (diasParaVencer <= 3) return 50;
    if (diasParaVencer <= 7) return 35;
    if (diasParaVencer <= 15) return 20;
    return 10;
  }
}

module.exports = GeminiAdapter;
