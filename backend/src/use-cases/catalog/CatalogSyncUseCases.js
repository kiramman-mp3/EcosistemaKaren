const { ValidationException } = require('../../domain/exceptions/DomainExceptions');
const { SECTIONS } = require('../../infrastructure/sync/catalogSections');

// portal-api: aplica el snapshot de una sección que publica la tienda.
class ApplyCatalogSnapshot {
  constructor(catalogMirrorRepository) {
    this.catalogMirrorRepository = catalogMirrorRepository;
  }

  async execute({ section, version, items }) {
    if (!SECTIONS[section]) {
      throw new ValidationException(`Sección de catálogo desconocida: ${section}.`);
    }
    if (!Number.isSafeInteger(version) || version <= 0) {
      throw new ValidationException('La versión del snapshot debe ser un entero positivo.');
    }
    if (!Array.isArray(items)) {
      throw new ValidationException('El snapshot debe incluir la lista de elementos.');
    }
    const result = await this.catalogMirrorRepository.applySnapshot(section, version, items);
    return { section, version, ...result };
  }
}

module.exports = { ApplyCatalogSnapshot };
