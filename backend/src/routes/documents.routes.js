const express = require('express');

function createDocumentsRouter({ controller, requireUser, uploadFile }) {
  const router = express.Router();

  router.post('/upload', requireUser, uploadFile, controller.upload);
  router.get('/documents', requireUser, controller.list);
  router.get('/documents/:id/download', requireUser, controller.download);

  return router;
}

module.exports = { createDocumentsRouter };
