export type ServerStatus = 'idle' | 'scanning' | 'connected' | 'completed' | 'error' | 'retrying';

export interface Server {
  id: string;
  name: string;
  url: string;
  user: string;
  password?: string;
  status: ServerStatus;
  activeChannels: number;
  lastScan: string;
  protocol?: string | null;
  updatedAt?: string;
}

export interface Category {
  category_id: string;
  category_name: string;
  parent_id?: string;
}

export interface Channel {
  id: string;
  name: string;
  stream_url: string;
  category: string;
  logo: string;
  stream_id?: string;
}

export interface ScanProgress {
  current: number;
  total: number;
  percentage: number;
  startTime: number | null;
  eta: number | null;
  currentServer?: string;
  currentCategory?: string;
  channelsFound: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  serverId?: string;
  category?: string;
}

export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';

export interface ConnectionStatus {
  isConnecting: boolean;
  attempts: number;
  lastError?: string;
  nextRetryIn?: number;
  retryTimeoutId?: NodeJS.Timeout;
}

export interface ScanResult {
  success: boolean;
  channels: number;
  categories: number;
  errors: string[];
  duration: number;
  serverId: string;
}

export interface Stats {
    serverCount: number;
    channelCount: number;
    lastScanTime: string;
    cacheSize: number;
}
