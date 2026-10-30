const { AppError } = require('../errors');

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Recurso não encontrado.' });
}

function isClientError(status) {
  return Number.isInteger(status) && status >= 400 && status < 500;
}

// O Express reconhece o tratador de erros pela assinatura com 4 parâmetros.
function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof AppError) {
    return res.status(error.status).json({ error: error.message });
  }

  // Erros 4xx do próprio Express (ex.: URL malformada) não expõem detalhes.
  if (isClientError(error.status)) {
    return res.status(error.status).json({ error: 'Requisição inválida.' });
  }

  console.error(error);
  return res.status(500).json({ error: 'Erro interno ao processar a requisição.' });
}

module.exports = { notFoundHandler, errorHandler };
