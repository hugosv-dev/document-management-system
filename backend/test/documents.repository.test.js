const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createDocumentsRepository } = require('../src/repositories/documents.repository');

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

describe('documents.repository', () => {
  let storageDir;
  let repository;

  before(() => {
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-repository-'));
    repository = createDocumentsRepository({ storageDir });
  });

  after(() => {
    fs.rmSync(storageDir, { recursive: true, force: true });
  });

  it('gera nomes físicos sem aproveitar caminhos do nome original', () => {
    const cases = {
      '../../fora.txt': new RegExp(`^${UUID}\\.txt$`),
      'RELATORIO.PDF': new RegExp(`^${UUID}\\.pdf$`),
      'sem-extensao': new RegExp(`^${UUID}$`),
      '.bashrc': new RegExp(`^${UUID}$`),
      'x.<script>': new RegExp(`^${UUID}$`),
      'arquivo.extensaomuitolonga': new RegExp(`^${UUID}$`),
    };

    for (const [originalName, expected] of Object.entries(cases)) {
      assert.match(repository.createStoredName(originalName), expected, originalName);
    }
  });

  it('mantém caminhos resolvidos dentro do diretório de armazenamento', () => {
    assert.equal(repository.resolveFilePath('../../etc/passwd'), path.join(storageDir, 'passwd'));
  });

  it('lista os documentos do dono do mais recente para o mais antigo, como cópias', async () => {
    await repository.save({ id: '1', owner: 'ana' });
    await repository.save({ id: '2', owner: 'bruno' });
    await repository.save({ id: '3', owner: 'ana' });

    const documents = await repository.findByOwner('ana');
    assert.deepEqual(
      documents.map((document) => document.id),
      ['3', '1'],
    );

    documents[0].owner = 'alterado';
    assert.equal((await repository.findById('3')).owner, 'ana');
    assert.deepEqual(await repository.findByOwner('sem-documentos'), []);
  });
});
