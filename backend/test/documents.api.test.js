const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../src/app');

const MAX_FILE_SIZE_BYTES = 64;

describe('API de documentos', () => {
  let storageDir;
  let server;
  let baseUrl;

  before(async () => {
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-api-'));
    const app = createApp({
      port: 0,
      storageDir,
      maxFileSizeMb: MAX_FILE_SIZE_BYTES / (1024 * 1024),
      maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    });

    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(storageDir, { recursive: true, force: true });
  });

  function upload(userId, { content = 'olá mundo', name = 'relatório.txt', field = 'file' } = {}) {
    const form = new FormData();
    form.append(field, new Blob([content], { type: 'text/plain' }), name);
    const headers = userId ? { 'X-User-Id': userId } : {};
    return fetch(`${baseUrl}/upload`, { method: 'POST', headers, body: form });
  }

  function get(urlPath, userId) {
    const headers = userId ? { 'X-User-Id': userId } : {};
    return fetch(`${baseUrl}${urlPath}`, { headers });
  }

  function storedFiles() {
    return fs.readdirSync(storageDir);
  }

  it('envia, lista e baixa um documento', async () => {
    const uploadResponse = await upload('ana');
    assert.equal(uploadResponse.status, 201);
    const document = await uploadResponse.json();

    assert.equal(document.originalName, 'relatório.txt');
    assert.equal(document.owner, 'ana');
    assert.equal(document.size, Buffer.byteLength('olá mundo'));
    assert.equal(document.mimeType, 'text/plain');
    assert.ok(!('storedName' in document));

    const listResponse = await get('/documents', 'ana');
    assert.equal(listResponse.status, 200);
    const documents = await listResponse.json();
    assert.ok(documents.some((item) => item.id === document.id));

    const downloadResponse = await get(`/documents/${document.id}/download`, 'ana');
    assert.equal(downloadResponse.status, 200);
    assert.match(downloadResponse.headers.get('content-type'), /^text\/plain/);
    const contentDisposition = downloadResponse.headers.get('content-disposition');
    assert.match(contentDisposition, /^attachment;/);
    assert.match(contentDisposition, /filename="relatório\.txt"/);
    assert.equal(await downloadResponse.text(), 'olá mundo');
  });

  it('grava o arquivo com nome gerado pelo sistema', async () => {
    const existingFiles = new Set(storedFiles());

    const response = await upload('ana', { name: '../../fora.txt' });
    assert.equal(response.status, 201);

    const created = storedFiles().filter((file) => !existingFiles.has(file));
    assert.equal(created.length, 1);
    assert.match(created[0], /^[0-9a-f-]{36}\.txt$/);
  });

  it('não expõe documentos de outro usuário', async () => {
    const document = await (await upload('ana')).json();

    const documents = await (await get('/documents', 'bruno')).json();
    assert.ok(documents.every((item) => item.owner === 'bruno'));

    const response = await get(`/documents/${document.id}/download`, 'bruno');
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Documento não encontrado.' });
  });

  it('retorna lista vazia para usuário sem documentos', async () => {
    const response = await get('/documents', 'sem-documentos');

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
  });

  it('exige o cabeçalho X-User-Id', async () => {
    const responses = [
      await upload(''),
      await get('/documents'),
      await get('/documents/qualquer/download'),
    ];

    for (const response of responses) {
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: 'Usuário não informado.' });
    }
  });

  it('rejeita upload sem arquivo', async () => {
    const response = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': 'ana' },
      body: new FormData(),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'Nenhum arquivo enviado.' });
  });

  it('rejeita arquivo enviado em campo diferente de "file"', async () => {
    const response = await upload('ana', { field: 'documento' });

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /campo "file"/);
  });

  it('rejeita arquivo acima do tamanho máximo sem deixar resíduo no disco', async () => {
    const fileCountBefore = storedFiles().length;

    const response = await upload('ana', { content: 'x'.repeat(MAX_FILE_SIZE_BYTES + 1) });

    assert.equal(response.status, 413);
    assert.match((await response.json()).error, /tamanho máximo/);
    assert.equal(storedFiles().length, fileCountBefore);
  });

  it('retorna 404 para documento inexistente', async () => {
    const response = await get('/documents/nao-existe/download', 'ana');

    assert.equal(response.status, 404);
  });

  it('retorna 404 quando o arquivo foi removido do disco', async () => {
    const existingFiles = new Set(storedFiles());
    const document = await (await upload('ana')).json();
    const [storedName] = storedFiles().filter((file) => !existingFiles.has(file));
    fs.rmSync(path.join(storageDir, storedName));

    const response = await get(`/documents/${document.id}/download`, 'ana');

    assert.equal(response.status, 404);
  });
});
