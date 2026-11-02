export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = 'ERRO',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, message, 'REQUISICAO_INVALIDA', details);
  }
  static unauthorized(message = 'Não autenticado') {
    return new AppError(401, message, 'NAO_AUTENTICADO');
  }
  static forbidden(message = 'Acesso negado para o seu perfil') {
    return new AppError(403, message, 'ACESSO_NEGADO');
  }
  static notFound(message = 'Recurso não encontrado') {
    return new AppError(404, message, 'NAO_ENCONTRADO');
  }
  static conflict(message: string, details?: unknown) {
    return new AppError(409, message, 'CONFLITO', details);
  }
  static unprocessable(message: string, details?: unknown) {
    return new AppError(422, message, 'REGRA_DE_NEGOCIO', details);
  }
}
