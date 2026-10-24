const { ValidationException } = require('../../domain/exceptions/DomainExceptions');
const { SECTIONS, SECTION_ORDER } = require('../../infrastructure/sync/catalogSections');

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

// Estado de la copia del catálogo que ven los clientes. Las secciones sin cambios solo se
// reenvían en el reenvío completo de la tienda, así que `staleAfterSeconds` debe ser mayor que
// ese intervalo. En el monolito (modo 'direct') el catálogo se lee de la fuente y nunca está viejo.
class GetCatalogSyncStatus {
  constructor(catalogMirrorRepository, { mode = 'mirror', staleAfterSeconds = 1200, clock = () => Date.now() } = {}) {
    this.catalogMirrorRepository = catalogMirrorRepository;
    this.mode = mode;
    this.staleAfterSeconds = staleAfterSeconds;
    this.clock = clock;
  }

  async execute() {
    if (this.mode === 'direct') {
      return { mode: 'direct', stale: false, lastSyncAt: null, staleAfterSeconds: null, sections: [] };
    }

    const sections = this.catalogMirrorRepository ? await this.catalogMirrorRepository.getSyncStatus() : [];
    const synced = new Map(sections.map(section => [section.seccion, section]));
    const missing = SECTION_ORDER.filter(name => !synced.has(name));
    const oldest = sections.length
      ? Math.min(...sections.map(section => Date.parse(section.sincronizadoAt)))
      : null;
    const ageSeconds = oldest === null ? null : Math.max(0, Math.floor((this.clock() - oldest) / 1000));
    const stale = missing.length > 0 || ageSeconds > this.staleAfterSeconds;

    return {
      mode: 'mirror',
      stale,
      lastSyncAt: oldest === null ? null : new Date(oldest).toISOString(),
      secondsSinceSync: ageSeconds,
      staleAfterSeconds: this.staleAfterSeconds,
      missingSections: missing,
      sections
    };
  }
}

module.exports = { ApplyCatalogSnapshot, GetCatalogSyncStatus };
