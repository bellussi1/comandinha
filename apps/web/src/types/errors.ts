/**
 * Tipos para tratamento padronizado de erros
 */

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  code?: string;
  statusCode?: number;
  details?: any;
  timestamp: Date;
  context?: {
    url?: string;
    method?: string;
    userId?: string;
    mesaId?: string;
  };
}

export interface ServiceResponse<T> {
  data?: T;
  error?: AppError;
  success: boolean;
  message?: string;
}

export interface ErrorHandlerConfig {
  showToast?: boolean;
  logError?: boolean;
  redirectOnAuth?: boolean;
  retryable?: boolean;
}

export const ERROR_MESSAGES = {
  NETWORK: {
    OFFLINE: 'Verifique sua conexão com a internet',
    TIMEOUT: 'A operação demorou mais que o esperado',
    CONNECTION_FAILED: 'Não foi possível conectar ao servidor'
  },
  AUTHENTICATION: {
    INVALID_CREDENTIALS: 'Email ou senha incorretos',
    TOKEN_EXPIRED: 'Sua sessão expirou. Faça login novamente',
    UNAUTHORIZED: 'Acesso não autorizado'
  },
  VALIDATION: {
    INVALID_DATA: 'Dados informados são inválidos',
    REQUIRED_FIELD: 'Campos obrigatórios não preenchidos',
    INVALID_FORMAT: 'Formato dos dados está incorreto'
  },
  SERVER: {
    INTERNAL_ERROR: 'Erro interno do servidor',
    SERVICE_UNAVAILABLE: 'Serviço temporariamente indisponível',
    MAINTENANCE: 'Sistema em manutenção'
  },
  NOT_FOUND: {
    RESOURCE: 'Recurso não encontrado',
    PAGE: 'Página não encontrada'
  }
} as const;