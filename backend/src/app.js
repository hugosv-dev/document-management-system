// Composição do backend do Document Management System.
//
// Clean Architecture simples: routes -> controllers -> services -> repositories.
// Uploads são gravados no filesystem local com multer + diskStorage; não
// utilize provedores externos.

const express = require('express');
const { loadConfig } = require('./config');
const { createDocumentsRepository } = require('./repositories/documents.repository');
const { createDocumentsService } = require('./services/documents.service');
const { createDocumentsController } = require('./controllers/documents.controller');
const { createDocumentsRouter } = require('./routes/documents.routes');
const { requireUser } = require('./middlewares/user.middleware');
const { createUploadMiddleware } = require('./middlewares/upload.middleware');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

function setSecurityHeaders(req, res, next) {
  res.set('X-Content-Type-Options', 'nosniff');
  next();
}

function createApp(config) {
  const app = express();

  app.disable('x-powered-by');
  app.use(setSecurityHeaders);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  const repository = createDocumentsRepository({ storageDir: config.storageDir });
  const service = createDocumentsService({ repository });
  const controller = createDocumentsController({ service });
  const uploadFile = createUploadMiddleware({
    storageDir: repository.storageDir,
    createStoredName: repository.createStoredName,
    maxFileSizeBytes: config.maxFileSizeBytes,
    maxFileSizeMb: config.maxFileSizeMb,
  });

  app.use(createDocumentsRouter({ controller, requireUser, uploadFile }));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

// O seed (test/app.test.js) espera que require('./app') retorne o app Express.
module.exports = createApp(loadConfig());
module.exports.createApp = createApp;
