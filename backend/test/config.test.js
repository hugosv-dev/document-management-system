const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadConfig } = require('../src/config');

const BACKEND_ROOT = path.resolve(__dirname, '..');

describe('loadConfig', () => {
  it('aplica os valores padrão quando as variáveis não existem ou estão vazias', () => {
    for (const env of [{}, { PORT: '', STORAGE_DIR: ' ', MAX_FILE_SIZE_MB: '' }]) {
      const config = loadConfig(env);

      assert.equal(config.port, 3000);
      assert.equal(config.storageDir, path.join(BACKEND_ROOT, 'storage'));
      assert.equal(config.maxFileSizeMb, 10);
      assert.equal(config.maxFileSizeBytes, 10 * 1024 * 1024);
    }
  });

  it('usa as variáveis de ambiente quando informadas', () => {
    const config = loadConfig({ PORT: '4000', STORAGE_DIR: '/tmp/dms', MAX_FILE_SIZE_MB: '2' });

    assert.equal(config.port, 4000);
    assert.equal(config.storageDir, '/tmp/dms');
    assert.equal(config.maxFileSizeBytes, 2 * 1024 * 1024);
  });

  it('resolve STORAGE_DIR relativo a partir da pasta backend', () => {
    const config = loadConfig({ STORAGE_DIR: 'dados/arquivos' });

    assert.equal(config.storageDir, path.join(BACKEND_ROOT, 'dados', 'arquivos'));
  });

  it('falha na inicialização com PORT inválida', () => {
    for (const port of ['abc', '0', '70000', '3000.5']) {
      assert.throws(() => loadConfig({ PORT: port }), /PORT inválida/);
    }
  });

  it('falha na inicialização com MAX_FILE_SIZE_MB inválido', () => {
    for (const size of ['abc', '0', '-1']) {
      assert.throws(() => loadConfig({ MAX_FILE_SIZE_MB: size }), /MAX_FILE_SIZE_MB inválido/);
    }
  });
});
