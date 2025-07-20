'use client';

import React, { useEffect, useRef } from 'react';

const ActivityLog = ({ logs, onClearLogs }) => {
  const logContainerRef = useRef(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [logs]);

  const getLevelClass = (level) => {
    const levelMap = {
      'info': 'info',
      'success': 'success',
      'warning': 'warning',
      'error': 'error',
      'debug': 'debug'
    };
    return levelMap[level] || 'info';
  };

  return (
    <div className="activity-log">
      <div className="log-header">
        <h2>
          <span className="icon">📋</span>
          Log de Actividades
        </h2>
        <button 
          className="btn btn-secondary btn-small" 
          onClick={onClearLogs}
        >
          <span>🧹</span> Limpiar Log
        </button>
      </div>
      
      <div className="log-container" ref={logContainerRef}>
        {logs.length === 0 ? (
          <div className="text-center" style={{ 
            color: 'var(--text-muted)', 
            padding: '20px', 
            fontStyle: 'italic' 
          }}>
            El log de actividades aparecerá aquí...
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="log-entry fade-in">
              <span className="log-timestamp">[{log.timestamp}]</span>
              <span className={`log-level ${getLevelClass(log.level)}`}>
                {log.level.toUpperCase()}
              </span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
