export const CONFIG = {
  // Procesamiento
  CHUNK_SIZE: 1000,
  SLEEP_TIME: 10,
  MAX_PARALLEL: 3,
  
  // Timeouts (convertidos desde el HTML)
  REQUEST_TIMEOUT: 15000,
  AUTH_TIMEOUT: 8000,
  SCAN_TIMEOUT: 300000,
  
  // Error 512 específicos
  ERROR_512_MAX_ATTEMPTS: 10,
  ERROR_512_BASE_DELAY: 8000,
  ERROR_512_MAX_DELAY: 180000,
  ERROR_512_AUTO_RETRY: 300000,
  
  // Memoria
  MAX_MEMORY: 200, // MB
  CLEANUP_INTERVAL: 10000, // canales
  
  // Storage
  STORAGE_PREFIX: 'iptv_studio1_',
  CHECKPOINT_INTERVAL: 10000,
  
  // UI
  LOG_MAX_ENTRIES: 1000,
  UPDATE_INTERVAL: 100,
  NOTIFICATION_DURATION: 5000,
  
  // Configuraciones UI
  UI: {
    HEADER_HEIGHT: '80px',
    SIDEBAR_WIDTH: '280px',
    CARD_BORDER_RADIUS: '12px',
    ANIMATION_DURATION: '300ms',
    TOAST_POSITION: 'top-right' as const,
  },
  
  // Validaciones
  VALIDATION: {
    MIN_SERVER_NAME_LENGTH: 3,
    MAX_SERVER_NAME_LENGTH: 50,
    MIN_PASSWORD_LENGTH: 1,
    URL_REGEX: /^https?:\/\/.+/i,
  }
} as const;

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;

export const SERVER_STATUS_COLORS: Record<string, string> = {
  idle: 'bg-slate-500',
  scanning: 'bg-warning-500',
  connected: 'bg-success-500',
  completed: 'bg-info-500',
  error: 'bg-error-500',
  retrying: 'bg-warning-500',
} as const;

export const LOG_LEVEL_COLORS = {
  info: 'bg-info-500',
  success: 'bg-success-500', 
  warning: 'bg-warning-500',
  error: 'bg-error-500',
  debug: 'bg-slate-500',
} as const;
