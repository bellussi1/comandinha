import { AxiosError } from 'axios';
import { 
  AppError, 
  ErrorType, 
  ErrorSeverity, 
  ServiceResponse,
  ErrorHandlerConfig,
  ERROR_MESSAGES 
} from '@/src/types/errors';

/**
 * Classe para tratamento centralizado de erros
 */
export class ErrorHandler {
  /**
   * Converte erro do Axios em AppError padronizado
   */
  static handleAxiosError(error: AxiosError, context?: any): AppError {
    const statusCode = error.response?.status;
    const errorData = error.response?.data as any;
    
    const appError: AppError = {
      type: this.getErrorType(statusCode, error),
      severity: this.getErrorSeverity(statusCode),
      message: this.getErrorMessage(error),
      userMessage: this.getUserFriendlyMessage(statusCode, errorData),
      code: errorData?.code || error.code,
      statusCode,
      details: errorData,
      timestamp: new Date(),
      context: {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        ...context
      }
    };

    return appError;
  }

  /**
   * Determina o tipo do erro baseado no status code
   */
  private static getErrorType(statusCode?: number, error?: AxiosError): ErrorType {
    if (error?.code === 'NETWORK_ERROR' || error?.message.includes('Network Error')) {
      return ErrorType.NETWORK;
    }

    switch (statusCode) {
      case 401:
        return ErrorType.AUTHENTICATION;
      case 403:
        return ErrorType.AUTHORIZATION;
      case 400:
      case 422:
        return ErrorType.VALIDATION;
      case 404:
        return ErrorType.NOT_FOUND;
      case 500:
      case 502:
      case 503:
      case 504:
        return ErrorType.SERVER;
      default:
        return ErrorType.UNKNOWN;
    }
  }

  /**
   * Determina a severidade do erro
   */
  private static getErrorSeverity(statusCode?: number): ErrorSeverity {
    switch (statusCode) {
      case 400:
      case 404:
        return ErrorSeverity.LOW;
      case 401:
      case 403:
      case 422:
        return ErrorSeverity.MEDIUM;
      case 500:
      case 502:
      case 503:
        return ErrorSeverity.HIGH;
      case 504:
        return ErrorSeverity.CRITICAL;
      default:
        return ErrorSeverity.LOW;
    }
  }

  /**
   * Extrai mensagem técnica do erro
   */
  private static getErrorMessage(error: AxiosError): string {
    const errorData = error.response?.data as any;
    
    if (errorData?.message) {
      return errorData.message;
    }
    
    if (errorData?.error) {
      return errorData.error;
    }
    
    if (error.message) {
      return error.message;
    }
    
    return 'Erro desconhecido';
  }

  /**
   * Gera mensagem amigável para o usuário
   */
  private static getUserFriendlyMessage(statusCode?: number, errorData?: any): string {
    // Verificar se o servidor enviou mensagem customizada
    if (errorData?.userMessage) {
      return errorData.userMessage;
    }

    switch (statusCode) {
      case 400:
        return errorData?.message || ERROR_MESSAGES.VALIDATION.INVALID_DATA;
      case 401:
        return ERROR_MESSAGES.AUTHENTICATION.UNAUTHORIZED;
      case 403:
        return 'Você não tem permissão para realizar esta ação';
      case 404:
        return ERROR_MESSAGES.NOT_FOUND.RESOURCE;
      case 422:
        return ERROR_MESSAGES.VALIDATION.INVALID_DATA;
      case 500:
        return ERROR_MESSAGES.SERVER.INTERNAL_ERROR;
      case 502:
      case 503:
        return ERROR_MESSAGES.SERVER.SERVICE_UNAVAILABLE;
      case 504:
        return ERROR_MESSAGES.NETWORK.TIMEOUT;
      default:
        return 'Ocorreu um erro inesperado';
    }
  }

  /**
   * Cria resposta padronizada para serviços
   */
  static createServiceResponse<T>(error: AppError): ServiceResponse<T> {
    return {
      success: false,
      error,
      message: error.userMessage
    };
  }

  /**
   * Cria resposta de sucesso padronizada
   */
  static createSuccessResponse<T>(data: T, message?: string): ServiceResponse<T> {
    return {
      success: true,
      data,
      message
    };
  }

  /**
   * Loga erro baseado na configuração
   */
  static logError(error: AppError, config: ErrorHandlerConfig = {}) {
    const { logError = true } = config;
    
    if (!logError) return;

    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[${error.type}] ${error.message}`;
    
    console[logLevel](logMessage, {
      userMessage: error.userMessage,
      statusCode: error.statusCode,
      context: error.context,
      details: error.details,
      timestamp: error.timestamp
    });

    // Em produção, enviar para serviço de logging
    if (process.env.NODE_ENV === 'production' && error.severity === ErrorSeverity.CRITICAL) {
      // TODO: Integrar com serviço de logging (Sentry, LogRocket, etc.)
    }
  }

  /**
   * Determina nível de log baseado na severidade
   */
  private static getLogLevel(severity: ErrorSeverity): 'log' | 'warn' | 'error' {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'log';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return 'error';
      default:
        return 'log';
    }
  }

  /**
   * Determina se erro é retryable
   */
  static isRetryable(error: AppError): boolean {
    const retryableTypes = [ErrorType.NETWORK, ErrorType.SERVER];
    const retryableStatusCodes = [502, 503, 504];
    
    return retryableTypes.includes(error.type) || 
           (error.statusCode ? retryableStatusCodes.includes(error.statusCode) : false);
  }

  /**
   * Cria erro customizado
   */
  static createError(
    type: ErrorType,
    message: string,
    userMessage: string,
    options?: Partial<AppError>
  ): AppError {
    return {
      type,
      severity: ErrorSeverity.MEDIUM,
      message,
      userMessage,
      timestamp: new Date(),
      ...options
    };
  }
}