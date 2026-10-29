const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadConfig } = require('../src/config');

describe('loadConfig', () => {
  it('aplica os valores padrão quando as variáveis não existem', () => {
    const config = loadConfig({});

    assert.equal(config.port, 3000);
    assert.equal(config.storageDir, path.resolve(__dirname, '..', 'storage'));
    assert.equal(config.maxFileSizeMb, 10);
    assert.equal(config.maxFileSizeBytes, 10 * 1024 * 1024);
  });

  it('usa as variáveis de ambiente quando informadas', () => {
    const config = loadConfig({ PORT: '4000', STORAGE_DIR: '/tmp/dms', MAX_FILE_SIZE_MB: '2' });

    assert.equal(config.port, 4000);
    assert.equal(config.storageDir, '/tmp/dms');
    assert.equal(config.maxFileSizeBytes, 2 * 1024 * 1024);
  });

  it('ignora valores numéricos inválidos', () => {
    const config = loadConfig({ PORT: 'abc', MAX_FILE_SIZE_MB: '-1' });

    assert.equal(config.port, 3000);
    assert.equal(config.maxFileSizeMb, 10);
  });
});
