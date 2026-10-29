const crypto = require('node:crypto');

class NotFoundError extends Error {
  constructor(message = 'Documento não encontrado.') {
    super(message);
    this.name = 'NotFoundError';
  }
}

function toPublicDocument({ storedName, ...publicFields }) {
  return publicFields;
}

function createDocumentsService({
  repository,
  generateId = () => crypto.randomUUID(),
  now = () => new Date(),
}) {
  function registerDocument({ owner, originalName, mimeType, size, storedName }) {
    const document = {
      id: generateId(),
      originalName,
      mimeType,
      size,
      uploadedAt: now().toISOString(),
      owner,
      storedName,
    };

    repository.save(document);
    return toPublicDocument(document);
  }

  function listDocuments(owner) {
    // reverse + sort estável: em empates de data, o último enviado vem primeiro.
    return repository
      .findByOwner(owner)
      .reverse()
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
      .map(toPublicDocument);
  }

  async function getDocumentForDownload(owner, id) {
    const document = repository.findById(id);

    // Documentos de outro usuário são tratados como inexistentes.
    if (!document || document.owner !== owner) {
      throw new NotFoundError();
    }

    if (!(await repository.fileExists(document.storedName))) {
      throw new NotFoundError();
    }

    return {
      ...toPublicDocument(document),
      filePath: repository.resolveFilePath(document.storedName),
    };
  }

  return { registerDocument, listDocuments, getDocumentForDownload };
}

module.exports = { createDocumentsService, NotFoundError };
