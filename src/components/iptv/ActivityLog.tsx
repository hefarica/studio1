
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useLogsStore } from '@/store/logs';
import { useNotifications } from '@/hooks/useNotifications';
import { LOG_LEVEL_COLORS } from '@/lib/constants';
import type { LogLevel } from '@/lib/types';
import { clsx } from 'clsx';

interface LogFilterProps {
  currentLevel: LogLevel | 'all';
  onLevelChange: (level: LogLevel | 'all') => void;
  logCounts: Record<LogLevel, number>;
}

const LogFilter: React.FC<LogFilterProps> = ({ currentLevel, onLevelChange, logCounts }) => {
  const levels: Array<{ key: LogLevel | 'all'; label: string; icon: string }> = [
    { key: 'all', label: 'Todos', icon: '📋' },
    { key: 'error', label: 'Errores', icon: '❌' },
    { key: 'warning', label: 'Advertencias', icon: '⚠️' },
    { key: 'success', label: 'Éxitos', icon: '✅' },
    { key: 'info', label: 'Info', icon: 'ℹ️' },
    { key: 'debug', label: 'Debug', icon: '🔧' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {levels.map(level => {
        const count = level.key === 'all' 
          ? Object.values(logCounts).reduce((sum, c) => sum + c, 0)
          : logCounts[level.key as LogLevel] || 0;
          
        return (
          <button
            key={level.key}
            onClick={() => onLevelChange(level.key)}
            className={clsx(
              'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200',
              currentLevel === level.key 
                ? 'bg-primary-600 text-white shadow-lg' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            )}
          >
            <span>{level.icon}</span>
            <span>{level.label}</span>
            {count > 0 && (
              <span className={clsx(
                'px-1.5 py-0.5 rounded-full text-xs font-bold',
                currentLevel === level.key 
                  ? 'bg-white/20' 
                  : 'bg-slate-600'
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export const ActivityLog: React.FC = () => {
  const { 
    logs, 
    clearLogs, 
    exportLogs, 
    isAutoScroll, 
    setAutoScroll,
  } = useLogsStore();
  const { success, info } = useNotifications();
  
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isAutoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isAutoScroll]);

  // Handle scroll detection for auto-scroll toggle
  const handleScroll = () => {
    const container = logContainerRef.current;
    if (!container) return;
    
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
    setAutoScroll(isAtBottom);
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchesSearch = !searchTerm || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.level.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesLevel && matchesSearch;
  });

  // Count logs by level
  const logCounts = logs.reduce((acc, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1;
    return acc;
  }, {} as Record<LogLevel, number>);

  const handleExportLogs = () => {
    const exportData = exportLogs();
    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `iptv-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    success('Logs exportados', 'Los logs se descargaron correctamente');
  };

  if (logs.length === 0) {
    return (
      <Card className="text-center py-12">
        <div className="text-4xl mb-4 opacity-50">📋</div>
        <h3 className="text-lg font-semibold text-slate-300 mb-2">
          Sin actividad registrada
        </h3>
        <p className="text-slate-400">
          Los logs de actividades aparecerán aquí conforme uses el sistema
        </p>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-600/30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-lg font-semibold text-white hover:text-primary-400 transition-colors"
          >
            <span className="text-2xl">📋</span>
            Log de Actividades
            <span className={clsx(
              'text-sm transition-transform duration-200',
              isExpanded ? 'rotate-180' : ''
            )}>
              ▼
            </span>
          </button>
          <div className="text-sm text-slate-400">
            {filteredLogs.length} de {logs.length} entradas
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="info"
            onClick={handleExportLogs}
            icon="📤"
          >
            Exportar
          </Button>
          
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              clearLogs();
              success('Logs limpiados', 'El historial fue reiniciado');
            }}
            icon="🧹"
          >
            Limpiar
          </Button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Filters and Search */}
          <div className="space-y-4 mb-6">
            <LogFilter
              currentLevel={filterLevel}
              onLevelChange={setFilterLevel}
              logCounts={logCounts}
            />
            
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Buscar en logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoScroll(!isAutoScroll)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isAutoScroll 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  )}
                >
                  <span>{isAutoScroll ? '📍' : '📌'}</span>
                  Auto-scroll
                </button>
              </div>
            </div>
          </div>

          {/* Log Container */}
          <div
            ref={logContainerRef}
            onScroll={handleScroll}
            className="max-h-96 overflow-y-auto bg-slate-800/50 rounded-lg border border-slate-600/30 p-4 space-y-2"
            style={{ scrollbarWidth: 'thin' }}
          >
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <div className="text-2xl mb-2">🔍</div>
                <p>No se encontraron logs con los filtros aplicados</p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-700/30 transition-colors group"
                >
                  <div className="flex-shrink-0 text-xs text-slate-500 font-mono min-w-[70px]">
                    {log.timestamp}
                  </div>
                  
                  <div className={clsx(
                    'flex-shrink-0 px-2 py-1 rounded text-xs font-bold uppercase min-w-[70px] text-center',
                    LOG_LEVEL_COLORS[log.level]
                  )}>
                    {log.level}
                  </div>
                  
                  <div className="flex-1 text-sm text-slate-300 font-mono leading-relaxed">
                    {log.message}
                  </div>
                  
                  {/* Metadata */}
                  {(log.serverId || log.category) && (
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        {log.serverId && (
                          <span className="bg-slate-600 px-1 py-0.5 rounded">
                            Server: {log.serverId.slice(-6)}
                          </span>
                        )}
                        {log.category && (
                          <span className="bg-slate-600 px-1 py-0.5 rounded">
                            {log.category}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            
            <div ref={bottomRef} />
          </div>

          {/* Log Stats */}
          <div className="mt-4 pt-4 border-t border-slate-600/30">
            <div className="flex items-center justify-between text-sm text-slate-400">
              <div className="flex items-center gap-4">
                <span>📊 Total: {logs.length} logs</span>
                <span>❌ Errores: {logCounts.error || 0}</span>
                <span>⚠️ Advertencias: {logCounts.warning || 0}</span>
                <span>✅ Éxitos: {logCounts.success || 0}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs">Auto-scroll:</span>
                <div className={clsx(
                  'w-2 h-2 rounded-full',
                  isAutoScroll ? 'bg-emerald-500' : 'bg-slate-500'
                )} />
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};
