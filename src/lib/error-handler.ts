import { CONFIG } from './constants';

export interface IPTVError {
  code: string;
  message: string;
  originalError?: string;
  suggestions: string[];
  isRetryable: boolean;
  retryAfter?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class IPTVErrorHandler {
  private static readonly ERROR_PATTERNS = {
    SERVER_512: /512|server.*internal.*error/i,
    UNEXPECTED_RESPONSE: /unexpected.*response|invalid.*response/i,
    CONNECTION_FAILED: /connection.*failed|failed.*to.*fetch/i,
    TIMEOUT: /timeout|timed.*out/i,
    AUTH_FAILED: /authentication.*failed|invalid.*credentials|unauthorized|401/i,
    CORS_ERROR: /cors.*error|cross.*origin/i,
    PARSE_ERROR: /parse.*error|json.*error/i,
  };

  static analyzeError(error: Error | string): IPTVError {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const lowerMessage = errorMessage.toLowerCase();

    if (this.ERROR_PATTERNS.SERVER_512.test(lowerMessage)) {
      return { code: 'SERVER_ERROR_512', message: 'El servidor IPTV tiene problemas internos.', originalError: errorMessage, suggestions: ['Esperar 2-5 minutos', 'Contactar al proveedor'], isRetryable: true, retryAfter: CONFIG.ERROR_512_BASE_DELAY, severity: 'medium' };
    }
    if (this.ERROR_PATTERNS.UNEXPECTED_RESPONSE.test(lowerMessage)) {
      return { code: 'UNEXPECTED_RESPONSE', message: 'Respuesta inesperada del servidor.', originalError: errorMessage, suggestions: ['Verificar URL y credenciales', 'Probar con proxy CORS'], isRetryable: true, retryAfter: 5000, severity: 'medium' };
    }
    if (this.ERROR_PATTERNS.CONNECTION_FAILED.test(lowerMessage)) {
      return { code: 'CONNECTION_FAILED', message: 'No se pudo conectar al servidor.', originalError: errorMessage, suggestions: ['Verificar URL y conexión a internet', 'Servidor puede estar offline'], isRetryable: true, retryAfter: 10000, severity: 'high' };
    }
    if (this.ERROR_PATTERNS.TIMEOUT.test(lowerMessage)) {
        return { code: 'TIMEOUT', message: 'Tiempo de espera agotado.', originalError: errorMessage, suggestions: ['Red lenta o inestable', 'Aumentar timeout'], isRetryable: true, retryAfter: 8000, severity: 'medium' };
    }
    if (this.ERROR_PATTERNS.AUTH_FAILED.test(lowerMessage)) {
        return { code: 'AUTH_FAILED', message: 'Credenciales incorrectas.', originalError: errorMessage, suggestions: ['Verificar usuario y contraseña'], isRetryable: false, severity: 'high' };
    }
    if (this.ERROR_PATTERNS.CORS_ERROR.test(lowerMessage)) {
        return { code: 'CORS_ERROR', message: 'Error de CORS.', originalError: errorMessage, suggestions: ['Se usarán proxies automáticamente', 'Probar en modo incógnito'], isRetryable: true, retryAfter: 3000, severity: 'low' };
    }
     if (this.ERROR_PATTERNS.PARSE_ERROR.test(lowerMessage)) {
        return { code: 'PARSE_ERROR', message: 'Error procesando respuesta.', originalError: errorMessage, suggestions: ['El servidor retornó datos en formato incorrecto'], isRetryable: true, retryAfter: 5000, severity: 'medium' };
    }

    return { code: 'UNKNOWN_ERROR', message: 'Error desconocido.', originalError: errorMessage, suggestions: ['Revisar logs para más detalles'], isRetryable: true, retryAfter: 5000, severity: 'medium' };
  }

  static async handleRetry<T>(operation: () => Promise<T>, context: { serverName: string; operationType: string }, maxAttempts = 5): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        const analyzedError = this.analyzeError(error);
        if (!analyzedError.isRetryable || attempt === maxAttempts) throw new Error(`${analyzedError.code}: ${analyzedError.message}`);
        let delay = analyzedError.retryAfter || 5000;
        if (['SERVER_ERROR_512', 'UNEXPECTED_RESPONSE'].includes(analyzedError.code)) {
          delay = Math.min(delay * Math.pow(1.5, attempt - 1), CONFIG.ERROR_512_MAX_DELAY);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('RETRY_FAILED: Falló después de múltiples intentos');
  }

  static getErrorIcon(errorCode: string): string {
    const iconMap: Record<string, string> = { 'SERVER_ERROR_512': '⚠️', 'UNEXPECTED_RESPONSE': '🔄', 'CONNECTION_FAILED': '🚫', 'TIMEOUT': '⏰', 'AUTH_FAILED': '🔐', 'CORS_ERROR': '🌐', 'PARSE_ERROR': '📄', 'UNKNOWN_ERROR': '❓' };
    return iconMap[errorCode] || '⚠️';
  }
}