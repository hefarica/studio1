'use client';

import React from 'react';

const StatsProDashboard = ({ stats }) => {
  return (
    <div className="stats-dashboard">
      <div className="stat-card">
        <div className="stat-icon">🖥️</div>
        <div className="stat-number">{stats.serversCount}</div>
        <div className="stat-label">Servidores</div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">📺</div>
        <div className="stat-number">{stats.channelsCount}</div>
        <div className="stat-label">Canales</div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">⏰</div>
        <div className="stat-number">{stats.lastScanTime}</div>
        <div className="stat-label">Último Escaneo</div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">💾</div>
        <div className="stat-number">{stats.cacheSize}</div>
        <div className="stat-label">Cache</div>
      </div>
    </div>
  );
};

export default StatsProDashboard;
