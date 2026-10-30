// Fluxo completo, casos de erro e segurança da API de documentos.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startApiTestServer } = require('../test-support/apiTestServer');

const MAX_FILE_SIZE_BYTES = 64;

describe('API de documentos', () => {
  let api;

  before(async () => {
    api = await startApiTestServer({ maxFileSizeBytes: MAX_FILE_SIZE_BYTES });
  });

  after(async () => {
    await api.stop();
  });

  it('envia, lista e baixa um documento', async () => {
    const uploadResponse = await api.upload('ana');
    assert.equal(uploadResponse.status, 201);
    const document = await uploadResponse.json();

    assert.equal(document.originalName, 'relatório.txt');
    assert.equal(document.owner, 'ana');
    assert.equal(document.size, Buffer.byteLength('olá mundo'));
    assert.equal(document.mimeType, 'text/plain');
    assert.ok(!('storedName' in document));

    const listResponse = await api.get('/documents', 'ana');
    assert.equal(listResponse.status, 200);
    const documents = await listResponse.json();
    assert.ok(documents.some((item) => item.id === document.id));

    const downloadResponse = await api.get(`/documents/${document.id}/download`, 'ana');
    assert.equal(downloadResponse.status, 200);
    assert.equal(downloadResponse.headers.get('content-type'), 'application/octet-stream');
    assert.equal(downloadResponse.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(downloadResponse.headers.get('x-powered-by'), null);
    const contentDisposition = downloadResponse.headers.get('content-disposition');
    assert.match(contentDisposition, /^attachment;/);
    assert.match(contentDisposition, /filename="relatório\.txt"/);
    assert.equal(await downloadResponse.text(), 'olá mundo');
  });

  it('serve como octet-stream mesmo quando o upload declara HTML', async () => {
    const form = new FormData();
    form.append('file', new Blob(['<script>alert(1)</script>'], { type: 'text/html' }), 'x.html');
    const response = await api.uploadForm('ana', form);
    const document = await response.json();

    const download = await api.get(`/documents/${document.id}/download`, 'ana');

    assert.equal(download.headers.get('content-type'), 'application/octet-stream');
    assert.equal(download.headers.get('x-content-type-options'), 'nosniff');
  });

  it('grava o arquivo com nome gerado pelo sistema', async () => {
    const existingFiles = new Set(api.storedFiles());

    const response = await api.upload('ana', { name: '../../fora.txt' });
    assert.equal(response.status, 201);

    const created = api.storedFiles().filter((file) => !existingFiles.has(file));
    assert.equal(created.length, 1);
    assert.match(created[0], /^[0-9a-f-]{36}\.txt$/);
  });

  it('não expõe documentos de outro usuário', async () => {
    const document = await (await api.upload('ana')).json();

    const documents = await (await api.get('/documents', 'bruno')).json();
    assert.ok(documents.every((item) => item.owner === 'bruno'));

    const response = await api.get(`/documents/${document.id}/download`, 'bruno');
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Documento não encontrado.' });
  });

  it('retorna lista vazia para usuário sem documentos', async () => {
    const response = await api.get('/documents', 'sem-documentos');

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
  });

  it('exige o cabeçalho X-User-Id', async () => {
    const responses = [
      await api.upload(''),
      await api.get('/documents'),
      await api.get('/documents/qualquer/download'),
    ];

    for (const response of responses) {
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: 'Usuário não informado.' });
    }
  });

  it('rejeita X-User-Id fora do formato permitido', async () => {
    for (const userId of ['ana maria', 'a'.repeat(65), 'ana/../bruno']) {
      const response = await api.get('/documents', userId);

      assert.equal(response.status, 400, userId);
      assert.match((await response.json()).error, /^Usuário inválido/);
    }
  });

  it('rejeita campos extras no upload sem gravar arquivos', async () => {
    const fileCountBefore = api.storedFiles().length;
    const form = new FormData();
    form.append('descricao', 'x'.repeat(1024));
    form.append('file', new Blob(['conteudo']), 'a.txt');

    const response = await api.uploadForm('ana', form);

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /campo "file"/);
    assert.equal(api.storedFiles().length, fileCountBefore);
  });

  it('rejeita upload sem arquivo', async () => {
    const response = await api.uploadForm('ana', new FormData());

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'Nenhum arquivo enviado.' });
  });

  it('rejeita arquivo enviado em campo diferente de "file"', async () => {
    const response = await api.upload('ana', { field: 'documento' });

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /campo "file"/);
  });

  it('rejeita arquivo acima do tamanho máximo sem deixar resíduo no disco', async () => {
    const fileCountBefore = api.storedFiles().length;

    const response = await api.upload('ana', { content: 'x'.repeat(MAX_FILE_SIZE_BYTES + 1) });

    assert.equal(response.status, 413);
    assert.match((await response.json()).error, /tamanho máximo/);
    assert.equal(api.storedFiles().length, fileCountBefore);
  });

  it('rejeita cedo pelo Content-Length um corpo muito acima do limite', async () => {
    const fileCountBefore = api.storedFiles().length;

    const response = await api.upload('ana', {
      content: 'x'.repeat(MAX_FILE_SIZE_BYTES + 128 * 1024),
    });

    assert.equal(response.status, 413);
    assert.equal(response.headers.get('connection'), 'close');
    assert.match((await response.json()).error, /tamanho máximo/);
    assert.equal(api.storedFiles().length, fileCountBefore);
  });

  it('responde em JSON para rota inexistente e URL malformada', async () => {
    const notFound = await api.get('/nao-existe');
    assert.equal(notFound.status, 404);
    assert.deepEqual(await notFound.json(), { error: 'Recurso não encontrado.' });

    const malformed = await api.get('/documents/%E0%A4%A/download', 'ana');
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { error: 'Requisição inválida.' });
  });

  it('não aceita JSON em rotas que não o utilizam', async () => {
    const response = await api.request('/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{inválido',
    });

    assert.equal(response.status, 404);
    const body = await response.text();
    assert.doesNotMatch(body, /at |node_modules/);
  });

  it('retorna 404 para documento inexistente', async () => {
    const response = await api.get('/documents/nao-existe/download', 'ana');

    assert.equal(response.status, 404);
  });

  it('retorna 404 quando o arquivo foi removido do disco', async () => {
    const existingFiles = new Set(api.storedFiles());
    const document = await (await api.upload('ana')).json();
    const [storedName] = api.storedFiles().filter((file) => !existingFiles.has(file));
    fs.rmSync(path.join(api.storageDir, storedName));

    const response = await api.get(`/documents/${document.id}/download`, 'ana');

    assert.equal(response.status, 404);
  });
});
