/**
 * Error code translations for user-friendly display.
 */
export const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_ALREADY_IN_USE: 'Este e-mail já está sendo utilizado por outra conta.',
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos. Verifique suas credenciais.',
  INVALID_REFRESH_TOKEN: 'Sua sessão expirou. Por favor, faça login novamente.',
  WEAK_PASSWORD: 'A senha deve conter no mínimo 8 caracteres.',
  VALIDATION_FAILED: 'Por favor, preencha todos os campos corretamente.',
  TOKEN_EXPIRED: 'Sua sessão expirou. Por favor, conecte-se novamente.',
  INVALID_TOKEN: 'Sessão inválida. Por favor, faça login.',
  METHOD_NOT_ALLOWED: 'Operação não permitida pelo servidor.',
  NOT_FOUND: 'Recurso solicitado não foi encontrado.',
  INTERNAL_SERVER_ERROR: 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.',
  EMAIL_UNVERIFIED: 'E-mail não verificado. Por favor, ative sua conta antes de continuar.',
};

/**
 * Gets a user-friendly error message from an API error code or falls back to a default message.
 */
export function getErrorMessage(code?: string, fallback: string = 'Ocorreu um erro inesperado. Tente novamente.'): string {
  if (!code) return fallback;
  return ERROR_MESSAGES[code] || fallback;
}
