const fs = require('node:fs');
const path = require('node:path');

// Persistência dos documentos: metadados em memória e arquivos no filesystem
// local (STORAGE_DIR). Nenhum provedor externo é utilizado.
function createDocumentsRepository({ storageDir }) {
  fs.mkdirSync(storageDir, { recursive: true });

  const documentsById = new Map();

  function save(document) {
    documentsById.set(document.id, { ...document });
    return { ...document };
  }

  function findById(id) {
    const document = documentsById.get(id);
    return document ? { ...document } : null;
  }

  function findByOwner(owner) {
    return [...documentsById.values()]
      .filter((document) => document.owner === owner)
      .map((document) => ({ ...document }));
  }

  // basename impede que um nome armazenado aponte para fora de storageDir.
  function resolveFilePath(storedName) {
    return path.join(storageDir, path.basename(storedName));
  }

  async function fileExists(storedName) {
    try {
      await fs.promises.access(resolveFilePath(storedName));
      return true;
    } catch {
      return false;
    }
  }

  return { save, findById, findByOwner, resolveFilePath, fileExists };
}

module.exports = { createDocumentsRepository };
