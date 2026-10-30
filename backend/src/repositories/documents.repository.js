const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SAFE_EXTENSION = /^\.[a-z0-9]{1,10}$/i;

// Persistência dos documentos: metadados em memória e arquivos no filesystem
// local (STORAGE_DIR). Este módulo é o único dono das regras de armazenamento.
function createDocumentsRepository({ storageDir }) {
  fs.mkdirSync(storageDir, { recursive: true });

  const documentsById = new Map();
  // Índice por dono, do documento mais recente para o mais antigo.
  const documentsByOwner = new Map();

  async function save(document) {
    const stored = { ...document };
    documentsById.set(stored.id, stored);

    const ownerDocuments = documentsByOwner.get(stored.owner) ?? [];
    ownerDocuments.unshift(stored);
    documentsByOwner.set(stored.owner, ownerDocuments);

    return { ...stored };
  }

  async function findById(id) {
    const document = documentsById.get(id);
    return document ? { ...document } : null;
  }

  async function findByOwner(owner) {
    return (documentsByOwner.get(owner) ?? []).map((document) => ({ ...document }));
  }

  // O nome físico é sempre gerado aqui; do nome original só se aproveita uma
  // extensão simples, para evitar path traversal.
  function createStoredName(originalName) {
    const extension = path.extname(originalName);
    const safeExtension = SAFE_EXTENSION.test(extension) ? extension.toLowerCase() : '';
    return `${crypto.randomUUID()}${safeExtension}`;
  }

  // basename impede que um nome armazenado aponte para fora de storageDir.
  function resolveFilePath(storedName) {
    return path.join(storageDir, path.basename(storedName));
  }

  return { storageDir, save, findById, findByOwner, createStoredName, resolveFilePath };
}

module.exports = { createDocumentsRepository };
