const multer = require('multer');
const { NotFoundError } = require('../services/documents.service');

const USER_HEADER = 'X-User-Id';

function createDocumentsController({ service, maxFileSizeMb }) {
  function requireUser(req, res, next) {
    const userId = (req.get(USER_HEADER) || '').trim();

    if (!userId) {
      return res.status(400).json({ error: 'Usuário não informado.' });
    }

    res.locals.userId = userId;
    return next();
  }

  function upload(req, res) {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const document = service.registerDocument({
      owner: res.locals.userId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      storedName: req.file.filename,
    });

    return res.status(201).json(document);
  }

  function list(req, res) {
    res.json(service.listDocuments(res.locals.userId));
  }

  async function download(req, res, next) {
    const document = await service.getDocumentForDownload(res.locals.userId, req.params.id);

    res.download(
      document.filePath,
      document.originalName,
      { headers: { 'Content-Type': document.mimeType } },
      (error) => {
        if (error && !res.headersSent) {
          next(error);
        }
      },
    );
  }

  // O Express reconhece o tratador de erros pela assinatura com 4 parâmetros.
  function handleError(error, req, res, next) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res
          .status(413)
          .json({ error: `Arquivo excede o tamanho máximo de ${maxFileSizeMb} MB.` });
      }

      return res
        .status(400)
        .json({ error: 'Requisição de upload inválida. Envie um único arquivo no campo "file".' });
    }

    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao processar o documento.' });
  }

  return { requireUser, upload, list, download, handleError };
}

module.exports = { createDocumentsController };
