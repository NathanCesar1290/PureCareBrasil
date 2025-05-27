class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;

    // Captura o stack trace para melhor depuração
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ErrorResponse;
