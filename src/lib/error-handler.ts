import { CONFIG } from './constants';
import type { IPTVServer } from './types';

export interface IPTVError {
  code: string;
  message: string;
  originalError?: string;
  suggestions: string[];
  isRetryable: boolean;
  retryAfter?: number; // milliseconds
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class IPTVErrorHandler {
  private static readonly ERROR_PATTERNS = {
    SERVER_512: /512|server.*internal.*error|internal.*server.*error/i,
    UNEXPECTED_RESPONSE: /unexpected.*response|invalid.*response|malformed.*response/i,
    CONNECTION_FAILED: /connection.*failed|failed.*connect|connect.*timeout/i,
    TIMEOUT: /timeout|timed.*out/i,
    NETWORK_ERROR: /network.*error|network.*unreachable|failed to fetch/i,
    AUTH_FAILED: /authentication.*failed|invalid.*credentials|unauthorized|401/i,
    ACCESS_DENIED: /access.*denied|forbidden|403/i,
    NOT_FOUND: /not.*found|404/i,
    SERVICE_UNAVAILABLE: /service.*unavailable|503/i,
    BAD_GATEWAY: /bad.*gateway|502/i,
    CORS_ERROR: /cors.*error|cross.*origin|access-control/i,
    INVALID_URL: /invalid.*url|malformed.*url|url.*format/i,
    PARSE_ERROR: /parse.*error|json.*error|invalid.*json/i,
  };

  static analyzeError(error: Error | string, context?: { serverName?: string; url?: string }): IPTVError {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const lowerMessage = errorMessage.toLowerCase();

    for (const [code, pattern] of Object.entries(this.ERROR_PATTERNS)) {
      if (pattern.test(lowerMessage)) {
        return this.getErrorDetails(code as keyof typeof this.ERROR_PATTERNS, errorMessage);
      }
    }

    return this.getErrorDetails('UNKNOWN_ERROR', errorMessage);
  }

  private static getErrorDetails(code: keyof typeof this.ERROR_PATTERNS | 'UNKNOWN_ERROR', originalError: string): IPTVError {
    switch (code) {
      case 'SERVER_512':
        return {
          code,
          message: 'El servidor IPTV está experimentando problemas internos (Error 512)',
          originalError,
          suggestions: ['Esperar 2-5 minutos antes de reintentar', 'El servidor puede estar sobrecargado', 'Verificar el estado con el proveedor'],
          isRetryable: true,
          retryAfter: CONFIG.ERROR_512_BASE_DELAY,
          severity: 'medium',
        };
      case 'NETWORK_ERROR':
        return {
            code,
            message: 'Error de red al conectar con el servidor',
            originalError,
            suggestions: ['Verificar la conectividad a internet del servidor', 'El servidor IPTV podría estar offline', 'Revisar firewalls o bloqueos de red'],
            isRetryable: true,
            retryAfter: 15000,
            severity: 'high',
        }
      case 'AUTH_FAILED':
        return {
          code,
          message: 'Credenciales incorrectas o expiradas',
          originalError,
          suggestions: ['Verificar usuario y contraseña', 'La cuenta podría haber expirado', 'Contactar al proveedor'],
          isRetryable: false,
          severity: 'high',
        };
      case 'TIMEOUT':
          return {
              code: 'TIMEOUT',
              message: 'Tiempo de espera agotado',
              originalError,
              suggestions: ['Conexión a internet lenta', 'Aumentar timeout en configuración', 'Servidor IPTV lento'],
              isRetryable: true,
              retryAfter: 8000,
              severity: 'medium'
          };
      default:
        return {
          code: 'UNKNOWN_ERROR',
          message: 'Error desconocido de conexión',
          originalError,
          suggestions: ['Verificar URL y credenciales', 'Comprobar conectividad', 'Contactar al proveedor'],
          isRetryable: true,
          retryAfter: 10000,
          severity: 'high',
        };
    }
  }

  static async handleRetry<T>(
    operation: () => Promise<T>,
    context: { serverName: string; operationType: string },
    maxAttempts = 3
  ): Promise<T> {
    let lastError: IPTVError | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[RETRY ${attempt}/${maxAttempts}] ${context.serverName} - ${context.operationType}`);
        return await operation();
      } catch (error: any) {
        const analyzedError = this.analyzeError(error, { serverName: context.serverName });
        lastError = analyzedError;
        
        console.log(`❌ [ATTEMPT ${attempt}] ${context.serverName}: ${analyzedError.message}`);
        
        if (!analyzedError.isRetryable || attempt === maxAttempts) {
          break;
        }
        
        const delay = (analyzedError.retryAfter || 5000) * Math.pow(1.5, attempt - 1);
        const cappedDelay = Math.min(delay, CONFIG.ERROR_512_MAX_DELAY);

        console.log(`⏳ [WAIT] ${context.serverName}: Esperando ${Math.round(cappedDelay/1000)}s`);
        await new Promise(resolve => setTimeout(resolve, cappedDelay));
      }
    }

    throw new Error(
      `${lastError?.code || 'RETRY_FAILED'}: ${lastError?.message || 'Falló después de múltiples intentos'}`
    );
  }
}
