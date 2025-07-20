'use client';

import { create } from 'zustand';
import { LogEntry, LogLevel } from '@/lib/types';
import { CONFIG } from '@/lib/constants';

interface LogsState {
  logs: LogEntry[];
  isAutoScroll: boolean;
  addLog: (message: string | any, level?: LogLevel, meta?: { serverId?: string; category?: string }) => void;
  clearLogs: () => void;
  setAutoScroll: (autoScroll: boolean) => void;
  exportLogs: () => string;
}

export const useLogsStore = create<LogsState>()((set, get) => ({
  logs: [],
  isAutoScroll: true,
  addLog: (rawMessage, level = 'info', meta = {}) => {
    // 1) Normalize message: if it's an array, join it; otherwise, cast it to a string
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(' ')
      : String(rawMessage ?? '');

    const newLog: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit'}),
      level,
      message,
      ...meta
    };

    set(state => {
      const updatedLogs = [...state.logs, newLog];
      if (updatedLogs.length > CONFIG.LOG_MAX_ENTRIES) {
        updatedLogs.splice(0, updatedLogs.length - CONFIG.LOG_MAX_ENTRIES);
      }
      return { logs: updatedLogs };
    });

    const consoleMethod = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log';
    console[consoleMethod](`[${newLog.timestamp}] [${level.toUpperCase()}] ${message}`);
  },
  clearLogs: () => {
    set({ logs: [] });
    get().addLog('Log limpiado', 'info');
  },
  setAutoScroll: (autoScroll) => set({ isAutoScroll: autoScroll }),
  exportLogs: () => {
    return get().logs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');
  }
}));

export const useLogs = () => useLogsStore();
