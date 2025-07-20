export type ServerStatus = 'Online' | 'Offline' | 'Scanning' | 'Error';

export interface Server {
  id: string;
  name: string;
  url: string;
  user: string;
  password?: string;
  status: ServerStatus;
  activeChannels: number;
  lastScan: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  level: 'info' | 'warning' | 'error' | 'success';
}

export interface Stats {
    serverCount: number;
    channelCount: number;
    lastScanTime: string;
    cacheSize: number;
}
