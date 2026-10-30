const { NotFoundError } = require('../errors');

function createDocumentsController({ service }) {
  async function upload(req, res) {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const document = await service.registerDocument({
      owner: res.locals.userId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      storedName: req.file.filename,
    });

    return res.status(201).json(document);
  }

  async function list(req, res) {
    res.json(await service.listDocuments(res.locals.userId));
  }

  async function download(req, res, next) {
    const document = await service.getDocumentForDownload(res.locals.userId, req.params.id);

    // octet-stream: o tipo informado no upload não é confiável para ser servido.
    res.download(
      document.filePath,
      document.originalName,
      { headers: { 'Content-Type': 'application/octet-stream' } },
      (error) => {
        if (error && !res.headersSent) {
          next(error.code === 'ENOENT' ? new NotFoundError() : error);
        }
      },
    );
  }

  return { upload, list, download };
}

module.exports = { createDocumentsController };
