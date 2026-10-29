// Servidor backend do Document Management System.
//
// Ponto de composição da Clean Architecture simples:
//   routes -> controllers -> services -> repositories
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const express = require('express');
const { loadConfig } = require('./config');
const { createDocumentsRepository } = require('./repositories/documents.repository');
const { createDocumentsService } = require('./services/documents.service');
const { createDocumentsController } = require('./controllers/documents.controller');
const { createDocumentsRouter } = require('./routes/documents.routes');

function createApp(config = loadConfig()) {
  const app = express();

  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  const repository = createDocumentsRepository({ storageDir: config.storageDir });
  const service = createDocumentsService({ repository });
  const controller = createDocumentsController({
    service,
    maxFileSizeMb: config.maxFileSizeMb,
  });

  app.use(
    createDocumentsRouter({
      controller,
      storageDir: config.storageDir,
      maxFileSizeBytes: config.maxFileSizeBytes,
    }),
  );

  return app;
}

const config = loadConfig();
const app = createApp(config);

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`DMS backend ouvindo na porta ${config.port}`);
  });
}

module.exports = app;
module.exports.createApp = createApp;
