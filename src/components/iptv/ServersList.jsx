'use client';

import React from 'react';

const ServersList = ({ servers, onRemoveServer, onScanServer, scanning }) => {
  const getStatusText = (status) => {
    const statusMap = {
      'idle': 'Inactivo',
      'scanning': 'Escaneando...',
      'connected': 'Conectado',
      'completed': 'Completado',
      'error': 'Error'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'scanning':
        return 'scanning';
      case 'error':
        return 'error';
      case 'completed':
        return 'completed';
      case 'connected':
        return 'connected';
      default:
        return '';
    }
  };

  if (servers.length === 0) {
    return (
      <div className="servers-section">
        <h2>
          <span>
            <span className="icon">📋</span>
            Servidores Configurados
          </span>
          <span className="server-count">0 servidor(es)</span>
        </h2>
        <div className="no-servers">
          <div className="icon">🗂️</div>
          <p>No hay servidores configurados</p>
        </div>
      </div>
    );
  }

  return (
    <div className="servers-section">
      <h2>
        <span>
          <span className="icon">📋</span>
          Servidores Configurados
        </span>
        <span className="server-count">{servers.length} servidor(es)</span>
      </h2>
      
      <div className="servers-list">
        {servers.map(server => (
          <div 
            key={server.id} 
            className={`server-card ${getStatusClass(server.status)}`}
            data-server-id={server.id}
          >
            <div className="server-header">
              <div className="server-name">{server.name}</div>
              <div className="server-actions">
                <button 
                  className="btn btn-info btn-small" 
                  onClick={() => onScanServer(server)}
                  disabled={scanning}
                  title="Escanear servidor"
                >
                  🔍
                </button>
                <button 
                  className="btn btn-danger btn-small" 
                  onClick={() => onRemoveServer(server.id)}
                  disabled={scanning}
                  title="Eliminar servidor"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            <div className="server-info">
              {server.url}<br />
              Usuario: {server.username} | Último escaneo: {server.lastScan || 'Nunca'}
            </div>
            
            <div className="server-stats">
              <span className={`stat ${server.channels > 0 ? 'highlight' : ''}`}>
                {server.channels} canales
              </span>
              <span className="stat">
                Protocolo: {server.protocol || 'No detectado'}
              </span>
              <span className="stat">
                Estado: {getStatusText(server.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServersList;
