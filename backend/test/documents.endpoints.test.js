// Testes de contrato por endpoint (formato das respostas, conteúdo e ordenação).
// Casos de erro e segurança ficam em documents.api.test.js.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startApiTestServer } = require('../test-support/apiTestServer');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PUBLIC_FIELDS = ['id', 'mimeType', 'originalName', 'owner', 'size', 'uploadedAt'];
const BINARY_CONTENT = Uint8Array.from({ length: 2048 }, (_, index) => index % 256);

describe('Endpoints de documentos', () => {
  let api;

  before(async () => {
    api = await startApiTestServer();
  });

  after(async () => {
    await api.stop();
  });

  async function uploadDocument(userId, options) {
    const response = await api.upload(userId, options);
    assert.equal(response.status, 201);
    return response.json();
  }

  describe('POST /upload', () => {
    it('responde 201 em JSON somente com os metadados públicos', async () => {
      const startedAt = Date.now();

      const response = await api.upload('contrato-upload', {
        name: 'proposta.pdf',
        type: 'application/pdf',
      });

      assert.equal(response.status, 201);
      assert.match(response.headers.get('content-type'), /^application\/json/);
      const document = await response.json();
      assert.deepEqual(Object.keys(document).sort(), PUBLIC_FIELDS);
      assert.match(document.id, UUID_PATTERN);
      assert.equal(document.originalName, 'proposta.pdf');
      assert.equal(document.mimeType, 'application/pdf');
      assert.equal(document.owner, 'contrato-upload');
      assert.equal(new Date(document.uploadedAt).toISOString(), document.uploadedAt);
      assert.ok(Date.parse(document.uploadedAt) >= startedAt - 1000);
    });

    it('grava no disco exatamente os bytes enviados', async () => {
      const existingFiles = new Set(api.storedFiles());

      const document = await uploadDocument('bytes-upload', {
        content: BINARY_CONTENT,
        name: 'dados.bin',
        type: 'application/octet-stream',
      });

      const [storedName] = api.storedFiles().filter((file) => !existingFiles.has(file));
      const storedContent = fs.readFileSync(path.join(api.storageDir, storedName));
      assert.equal(document.size, BINARY_CONTENT.length);
      assert.deepEqual(storedContent, Buffer.from(BINARY_CONTENT));
    });

    it('rejeita mais de um arquivo no mesmo envio sem deixar resíduo no disco', async () => {
      const fileCountBefore = api.storedFiles().length;
      const form = new FormData();
      form.append('file', new Blob(['primeiro']), 'a.txt');
      form.append('file', new Blob(['segundo']), 'b.txt');

      const response = await api.uploadForm('varios-arquivos', form);

      assert.equal(response.status, 400);
      assert.match((await response.json()).error, /único arquivo/);
      assert.equal(api.storedFiles().length, fileCountBefore);
      assert.deepEqual(await (await api.get('/documents', 'varios-arquivos')).json(), []);
    });
  });

  describe('GET /documents', () => {
    it('lista só os documentos do usuário, do mais recente para o mais antigo', async () => {
      const first = await uploadDocument('lista-ana', { name: 'a.txt' });
      await uploadDocument('lista-bruno', { name: 'outro.txt' });
      const second = await uploadDocument('lista-ana', { name: 'b.txt' });
      const third = await uploadDocument('lista-ana', { name: 'c.txt' });

      const response = await api.get('/documents', 'lista-ana');

      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /^application\/json/);
      const documents = await response.json();
      assert.deepEqual(
        documents.map((document) => document.id),
        [third.id, second.id, first.id],
      );
    });

    it('retorna os mesmos metadados devolvidos no upload', async () => {
      const uploaded = await uploadDocument('lista-metadados', { name: 'nota.txt' });

      const [listed] = await (await api.get('/documents', 'lista-metadados')).json();

      assert.deepEqual(listed, uploaded);
    });
  });

  describe('GET /documents/:id/download', () => {
    it('devolve o conteúdo binário byte a byte com Content-Length', async () => {
      const document = await uploadDocument('download-bytes', {
        content: BINARY_CONTENT,
        name: 'imagem.png',
        type: 'image/png',
      });

      const response = await api.get(`/documents/${document.id}/download`, 'download-bytes');

      assert.equal(response.status, 200);
      assert.equal(Number(response.headers.get('content-length')), document.size);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from(BINARY_CONTENT));
    });

    it('codifica no Content-Disposition nomes fora do Latin-1', async () => {
      const document = await uploadDocument('download-nome', { name: '合同 final.pdf' });

      const response = await api.get(`/documents/${document.id}/download`, 'download-nome');

      assert.equal(document.originalName, '合同 final.pdf');
      assert.match(
        response.headers.get('content-disposition'),
        /filename\*=UTF-8''%E5%90%88%E5%90%8C%20final\.pdf/,
      );
    });

    it('permite baixar o mesmo documento mais de uma vez', async () => {
      const document = await uploadDocument('download-repetido', { content: 'conteúdo fixo' });
      const downloadPath = `/documents/${document.id}/download`;

      const first = await api.get(downloadPath, 'download-repetido');
      const second = await api.get(downloadPath, 'download-repetido');

      assert.equal(await first.text(), 'conteúdo fixo');
      assert.equal(await second.text(), 'conteúdo fixo');
    });
  });
});
