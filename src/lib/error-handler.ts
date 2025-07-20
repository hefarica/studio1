
import { CONFIG } from './constants';

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
    // Error 512 - Server Internal Error
    SERVER_512: /512|server.*internal.*error|internal.*server.*error/i,
    
    // Unexpected response (nuevo error detectado)
    UNEXPECTED_RESPONSE: /unexpected.*response|invalid.*response|malformed.*response/i,
    
    // Connection errors
    CONNECTION_FAILED: /connection.*failed|failed.*connect|connect.*timeout/i,
    TIMEOUT: /timeout|timed.*out/i,
    NETWORK_ERROR: /network.*error|network.*unreachable/i,
    
    // Authentication errors
    AUTH_FAILED: /authentication.*failed|invalid.*credentials|unauthorized|401/i,
    ACCESS_DENIED: /access.*denied|forbidden|403/i,
    
    // Server errors
    NOT_FOUND: /not.*found|404/i,
    SERVICE_UNAVAILABLE: /service.*unavailable|503/i,
    BAD_GATEWAY: /bad.*gateway|502/i,
    
    // CORS errors
    CORS_ERROR: /cors.*error|cross.*origin|access-control/i,
    
    // URL/Format errors
    INVALID_URL: /invalid.*url|malformed.*url|url.*format/i,
    
    // JSON/Parse errors
    PARSE_ERROR: /parse.*error|json.*error|invalid.*json/i,
  };

  static analyzeError(error: Error | string, context?: { serverName?: string; url?: string }): IPTVError {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const lowerMessage = errorMessage.toLowerCase();

    // Análisis de patrones de error
    if (this.ERROR_PATTERNS.SERVER_512.test(lowerMessage)) {
      return {
        code: 'SERVER_ERROR_512',
        message: 'El servidor IPTV está experimentando problemas internos',
        originalError: errorMessage,
        suggestions: [
          'Esperar 2-5 minutos antes de reintentar',
          'El servidor puede estar sobrecargado temporalmente',
          'Verificar el estado del servicio con el proveedor',
          'Los reintentos automáticos están activos'
        ],
        isRetryable: true,
        retryAfter: CONFIG.ERROR_512_BASE_DELAY,
        severity: 'medium'
      };
    }

    // NUEVO: Manejo del error "unexpected response"
    if (this.ERROR_PATTERNS.UNEXPECTED_RESPONSE.test(lowerMessage)) {
      return {
        code: 'UNEXPECTED_RESPONSE',
        message: 'Respuesta inesperada del servidor IPTV',
        originalError: errorMessage,
        suggestions: [
          'Verificar que la URL del servidor sea correcta',
          'Confirmar que las credenciales estén actualizadas',
          'El servidor podría estar retornando datos en formato incorrecto',
          'Verificar la conectividad de red',
          'Probar con un proxy CORS diferente'
        ],
        isRetryable: true,
        retryAfter: 5000,
        severity: 'medium'
      };
    }

    if (this.ERROR_PATTERNS.CONNECTION_FAILED.test(lowerMessage)) {
      return {
        code: 'CONNECTION_FAILED',
        message: 'No se pudo establecer conexión con el servidor',
        originalError: errorMessage,
        suggestions: [
          'Verificar la URL del servidor',
          'Comprobar la conectividad a internet',
          'El servidor podría estar fuera de línea',
          'Verificar configuración de firewall/proxy'
        ],
        isRetryable: true,
        retryAfter: 10000,
        severity: 'high'
      };
    }

    if (this.ERROR_PATTERNS.TIMEOUT.test(lowerMessage)) {
      return {
        code: 'TIMEOUT',
        message: 'Tiempo de espera agotado',
        originalError: errorMessage,
        suggestions: [
          'Conexión a internet lenta o inestable',
          'Aumentar el tiempo de timeout en configuración',
          'Verificar latencia de red al servidor',
          'Considerar usar VPN si hay restricciones regionales'
        ],
        isRetryable: true,
        retryAfter: 8000,
        severity: 'medium'
      };
    }

    if (this.ERROR_PATTERNS.AUTH_FAILED.test(lowerMessage)) {
      return {
        code: 'AUTH_FAILED',
        message: 'Credenciales incorrectas o expiradas',
        originalError: errorMessage,
        suggestions: [
          'Verificar usuario y contraseña',
          'Las credenciales podrían haber expirado',
          'Contactar al proveedor IPTV para renovar acceso',
          'Verificar que la cuenta esté activa'
        ],
        isRetryable: false,
        severity: 'high'
      };
    }

    if (this.ERROR_PATTERNS.CORS_ERROR.test(lowerMessage)) {
      return {
        code: 'CORS_ERROR',
        message: 'Error de política CORS',
        originalError: errorMessage,
        suggestions: [
          'El navegador está bloqueando la conexión',
          'Se utilizarán proxies CORS automáticamente',
          'Probar en modo incógnito',
          'Deshabilitar extensiones temporalmente'
        ],
        isRetryable: true,
        retryAfter: 3000,
        severity: 'low'
      };
    }

    if (this.ERROR_PATTERNS.PARSE_ERROR.test(lowerMessage)) {
      return {
        code: 'PARSE_ERROR',
        message: 'Error procesando respuesta del servidor',
        originalError: errorMessage,
        suggestions: [
          'El servidor retornó datos en formato incorrecto',
          'Verificar que sea un servidor IPTV válido',
          'Contactar soporte técnico del proveedor',
          'Probar con diferentes proxies'
        ],
        isRetryable: true,
        retryAfter: 5000,
        severity: 'medium'
      };
    }

    // Error genérico
    return {
      code: 'UNKNOWN_ERROR',
      message: 'Error desconocido de conexión',
      originalError: errorMessage,
      suggestions: [
        'Verificar configuración del servidor',
        'Comprobar conectividad a internet',
        'Revisar logs para más detalles',
        'Contactar soporte técnico si persiste'
      ],
      isRetryable: true,
      retryAfter: 5000,
      severity: 'medium'
    };
  }

  static async handleRetry<T>(
    operation: () => Promise<T>,
    context: { serverName: string; operationType: string },
    maxAttempts = 5
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
        
        // Si no es reintentable, fallar inmediatamente
        if (!analyzedError.isRetryable) {
          throw new Error(`${analyzedError.code}: ${analyzedError.message}`);
        }
        
        // Si es el último intento, no esperar
        if (attempt === maxAttempts) {
          break;
        }
        
        // Calcular delay basado en el tipo de error
        let delay = analyzedError.retryAfter || 5000;
        
        // Backoff exponencial para errores específicos
        if (['SERVER_ERROR_512', 'UNEXPECTED_RESPONSE'].includes(analyzedError.code)) {
          delay = Math.min(delay * Math.pow(1.5, attempt - 1), CONFIG.ERROR_512_MAX_DELAY);
        }
        
        console.log(`⏳ [WAIT] ${context.serverName}: Esperando ${Math.round(delay/1000)}s (${analyzedError.code})`);
        await this.sleep(delay);
      }
    }

    throw new Error(
      `${lastError?.code || 'RETRY_FAILED'}: ${lastError?.message || 'Falló después de múltiples intentos'}`
    );
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static getErrorIcon(errorCode: string): string {
    const iconMap: Record<string, string> = {
      'SERVER_ERROR_512': '⚠️',
      'UNEXPECTED_RESPONSE': '🔄',
      'CONNECTION_FAILED': '🚫',
      'TIMEOUT': '⏰',
      'AUTH_FAILED': '🔐',
      'CORS_ERROR': '🌐',
      'PARSE_ERROR': '📄',
      'UNKNOWN_ERROR': '❓',
    };
    
    return iconMap[errorCode] || '⚠️';
  }

  static getErrorColor(severity: IPTVError['severity']): string {
    const colorMap = {
      'low': 'text-blue-400',
      'medium': 'text-warning-400',
      'high': 'text-error-400',
      'critical': 'text-error-500',
    };
    
    return colorMap[severity];
  }
}
