// Erros com status HTTP associado. O tratador global de erros usa `status`
// e `message` para montar a resposta { "error": "..." }.
class AppError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Documento não encontrado.') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

module.exports = { AppError, NotFoundError };
