const multer = require('multer');
const { AppError } = require('../errors');

// Folga para cabeçalhos e delimitadores do multipart além do próprio arquivo.
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

function fileTooLargeError(maxFileSizeMb) {
  return new AppError(`Arquivo excede o tamanho máximo de ${maxFileSizeMb} MB.`, 413);
}

function toUploadError(error, maxFileSizeMb) {
  if (!(error instanceof multer.MulterError)) {
    return error;
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return fileTooLargeError(maxFileSizeMb);
  }

  return new AppError(
    'Requisição de upload inválida. Envie um único arquivo no campo "file".',
    400,
  );
}

function createUploadMiddleware({ storageDir, createStoredName, maxFileSizeBytes, maxFileSizeMb }) {
  const upload = multer({
    storage: multer.diskStorage({
      destination: storageDir,
      filename: (req, file, callback) => callback(null, createStoredName(file.originalname)),
    }),
    // fields/parts limitados evitam que campos de texto extras consumam memória.
    limits: { fileSize: maxFileSizeBytes, files: 1, fields: 0, parts: 1, headerPairs: 100 },
    // Decodifica nomes de arquivo com acentos corretamente.
    defParamCharset: 'utf8',
  }).single('file');

  return function uploadFile(req, res, next) {
    const contentLength = Number(req.get('Content-Length'));

    // Rejeita cedo corpos claramente acima do limite, sem recebê-los por inteiro.
    if (contentLength > maxFileSizeBytes + MULTIPART_OVERHEAD_BYTES) {
      res.set('Connection', 'close');
      return next(fileTooLargeError(maxFileSizeMb));
    }

    return upload(req, res, (error) => next(error && toUploadError(error, maxFileSizeMb)));
  };
}

module.exports = { createUploadMiddleware };
