// Utilitário compartilhado pelos testes de API. Fica fora de test/ porque o
// `node --test` executa como teste todo arquivo .js dentro dessa pasta.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../src/app');

const BYTES_PER_MB = 1024 * 1024;

function userHeaders(userId) {
  return userId ? { 'X-User-Id': userId } : {};
}

async function startApiTestServer({ maxFileSizeBytes = BYTES_PER_MB } = {}) {
  const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-api-'));
  const app = createApp({
    storageDir,
    maxFileSizeBytes,
    maxFileSizeMb: maxFileSizeBytes / BYTES_PER_MB,
  });

  const server = await new Promise((resolve, reject) => {
    const listening = app.listen(0, (error) => (error ? reject(error) : resolve(listening)));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  function request(urlPath, options = {}) {
    return fetch(`${baseUrl}${urlPath}`, options);
  }

  function get(urlPath, userId) {
    return request(urlPath, { headers: userHeaders(userId) });
  }

  function uploadForm(userId, form) {
    return request('/upload', { method: 'POST', headers: userHeaders(userId), body: form });
  }

  function upload(
    userId,
    { content = 'olá mundo', name = 'relatório.txt', field = 'file', type = 'text/plain' } = {},
  ) {
    const form = new FormData();
    form.append(field, new Blob([content], { type }), name);
    return uploadForm(userId, form);
  }

  function storedFiles() {
    return fs.readdirSync(storageDir);
  }

  async function stop() {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(storageDir, { recursive: true, force: true });
  }

  return { baseUrl, storageDir, request, get, upload, uploadForm, storedFiles, stop };
}

module.exports = { startApiTestServer };
