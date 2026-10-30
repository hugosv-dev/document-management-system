const crypto = require('node:crypto');
const { NotFoundError } = require('../errors');

function toPublicDocument({ storedName, ...publicFields }) {
  return publicFields;
}

function createDocumentsService({
  repository,
  generateId = () => crypto.randomUUID(),
  now = () => new Date(),
}) {
  async function registerDocument({ owner, originalName, mimeType, size, storedName }) {
    const document = await repository.save({
      id: generateId(),
      originalName,
      mimeType,
      size,
      uploadedAt: now().toISOString(),
      owner,
      storedName,
    });

    return toPublicDocument(document);
  }

  async function listDocuments(owner) {
    const documents = await repository.findByOwner(owner);
    return documents.map(toPublicDocument);
  }

  async function getDocumentForDownload(owner, id) {
    const document = await repository.findById(id);

    // Documentos de outro usuário são tratados como inexistentes.
    if (!document || document.owner !== owner) {
      throw new NotFoundError();
    }

    return {
      ...toPublicDocument(document),
      filePath: repository.resolveFilePath(document.storedName),
    };
  }

  return { registerDocument, listDocuments, getDocumentForDownload };
}

module.exports = { createDocumentsService };
