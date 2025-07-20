export type ServerStatus = 'Online' | 'Offline' | 'Scanning' | 'Error';

export interface Server {
  id: string;
  name: string;
  url: string;
  status: ServerStatus;
  activeChannels?: number;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  level: 'info' | 'warning' | 'error';
}

export interface ScanProgress {
  progress: number;
  eta: string;
  memoryUsage: number;
  totalChannels: number;
}

export type AiOptimizationSuggestion = {
  suggestedFrequency: string;
  serverPrioritization: string[];
  resourceAllocation: string;
  additionalNotes: string;
};
