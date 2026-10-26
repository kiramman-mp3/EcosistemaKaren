const { GeminiError } = require('./GeminiAdapter');

/**
 * Tries the primary AI adapter and, if it fails with a provider error, the secondary one.
 * Exposes the primary's promptVersion/modelName (used for the cache key); the result
 * carries `modelo` when the secondary produced it, so the promotion records the real model.
 * When both fail, the primary's error is thrown (it is the one the operator configured).
 */
class FallbackAiAdapter {
  constructor(primary, secondary, { logger = console } = {}) {
    this._primary = primary;
    this._secondary = secondary;
    this._logger = logger;
  }

  get promptVersion() {
    return this._primary.promptVersion;
  }

  get modelName() {
    return this._primary.modelName;
  }

  async generarEstrategiaPromocional(params) {
    try {
      return await this._primary.generarEstrategiaPromocional(params);
    } catch (primaryError) {
      if (!(primaryError instanceof GeminiError)) throw primaryError;

      this._logger.warn(`[ai] ${this._primary.modelName} falló (${primaryError.type}); usando ${this._secondary.modelName}.`);
      try {
        const data = await this._secondary.generarEstrategiaPromocional(params);
        return { ...data, modelo: this._secondary.modelName };
      } catch (secondaryError) {
        this._logger.warn(`[ai] El respaldo ${this._secondary.modelName} también falló (${secondaryError.type || secondaryError.name}).`);
        throw primaryError;
      }
    }
  }
}

module.exports = FallbackAiAdapter;
