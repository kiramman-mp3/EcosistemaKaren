const fs = require('node:fs/promises');
const path = require('node:path');
const { isMediaPath, localFileFor } = require('./mediaPaths');

// Guarda las fotos de productos en la carpeta de medios de la tienda (la misma que sirve /api/v1/media
// y que el worker de sincronización copia al portal).
class LocalMediaStorage {
  constructor({ mediaDir, files = fs }) {
    this.mediaDir = mediaDir;
    this.files = files;
  }

  /** Escribe el archivo de forma atómica (temporal + renombrado): nadie lee una foto a medias. */
  async save(ruta, data) {
    if (!isMediaPath(ruta)) throw new Error(`Ruta de medios no válida: ${ruta}`);
    const target = localFileFor(this.mediaDir, ruta);
    await this.files.mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    try {
      await this.files.writeFile(temporary, data);
      await this.files.rename(temporary, target);
    } catch (error) {
      await this.files.rm(temporary, { force: true }).catch(() => {});
      throw error;
    }
  }

  /** Borra una foto; si ya no existe no es un error. */
  async remove(ruta) {
    if (!isMediaPath(ruta)) return;
    await this.files.rm(localFileFor(this.mediaDir, ruta), { force: true });
  }
}

module.exports = LocalMediaStorage;
