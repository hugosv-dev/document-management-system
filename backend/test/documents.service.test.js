const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createDocumentsRepository } = require('../src/repositories/documents.repository');
const { createDocumentsService, NotFoundError } = require('../src/services/documents.service');

describe('documents.service', () => {
  let storageDir;
  let service;
  let clock;

  function register(owner, storedName = `${owner}-${clock}.txt`) {
    return service.registerDocument({
      owner,
      originalName: 'arquivo.txt',
      mimeType: 'text/plain',
      size: 5,
      storedName,
    });
  }

  beforeEach(() => {
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-service-'));
    clock = 0;
    let sequence = 0;
    service = createDocumentsService({
      repository: createDocumentsRepository({ storageDir }),
      generateId: () => `doc-${++sequence}`,
      now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, clock++)),
    });
  });

  afterEach(() => {
    fs.rmSync(storageDir, { recursive: true, force: true });
  });

  it('registra o documento sem expor o nome físico', () => {
    const document = register('ana', 'interno.txt');

    assert.deepEqual(document, {
      id: 'doc-1',
      originalName: 'arquivo.txt',
      mimeType: 'text/plain',
      size: 5,
      uploadedAt: '2026-01-01T00:00:00.000Z',
      owner: 'ana',
    });
  });

  it('lista apenas os documentos do dono, do mais recente para o mais antigo', () => {
    register('ana');
    register('bruno');
    register('ana');

    const documents = service.listDocuments('ana');

    assert.deepEqual(
      documents.map((document) => document.id),
      ['doc-3', 'doc-1'],
    );
    assert.ok(documents.every((document) => !('storedName' in document)));
  });

  it('retorna o caminho do arquivo para download do próprio dono', async () => {
    const { id } = register('ana', 'existe.txt');
    fs.writeFileSync(path.join(storageDir, 'existe.txt'), 'conteudo');

    const document = await service.getDocumentForDownload('ana', id);

    assert.equal(document.filePath, path.join(storageDir, 'existe.txt'));
  });

  it('lança NotFoundError para documento inexistente', async () => {
    await assert.rejects(service.getDocumentForDownload('ana', 'nao-existe'), NotFoundError);
  });

  it('lança NotFoundError para documento de outro usuário', async () => {
    const { id } = register('ana', 'existe.txt');
    fs.writeFileSync(path.join(storageDir, 'existe.txt'), 'conteudo');

    await assert.rejects(service.getDocumentForDownload('bruno', id), NotFoundError);
  });

  it('lança NotFoundError quando o arquivo não está mais no disco', async () => {
    const { id } = register('ana', 'removido.txt');

    await assert.rejects(service.getDocumentForDownload('ana', id), NotFoundError);
  });
});
