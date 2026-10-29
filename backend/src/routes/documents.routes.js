const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const multer = require('multer');

const SAFE_EXTENSION = /^\.[a-z0-9]{1,10}$/i;

// O nome físico é sempre gerado pelo sistema; do nome original só se
// aproveita uma extensão simples, para evitar path traversal.
function buildStoredName(originalName) {
  const extension = path.extname(originalName);
  const safeExtension = SAFE_EXTENSION.test(extension) ? extension.toLowerCase() : '';
  return `${crypto.randomUUID()}${safeExtension}`;
}

function createUploadMiddleware({ storageDir, maxFileSizeBytes }) {
  const storage = multer.diskStorage({
    destination: storageDir,
    filename: (req, file, callback) => callback(null, buildStoredName(file.originalname)),
  });

  return multer({
    storage,
    limits: { fileSize: maxFileSizeBytes, files: 1 },
    // Decodifica nomes de arquivo com acentos corretamente.
    defParamCharset: 'utf8',
  }).single('file');
}

function createDocumentsRouter({ controller, storageDir, maxFileSizeBytes }) {
  const router = express.Router();
  const uploadFile = createUploadMiddleware({ storageDir, maxFileSizeBytes });

  router.post('/upload', controller.requireUser, uploadFile, controller.upload);
  router.get('/documents', controller.requireUser, controller.list);
  router.get('/documents/:id/download', controller.requireUser, controller.download);
  router.use(controller.handleError);

  return router;
}

module.exports = { createDocumentsRouter };
