'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ServerConfiguration from './ServerConfiguration';
import ServersList from './ServersList';
import StatsProDashboard from './StatsProDashboard';
import ProgressContainer from './ProgressContainer';
import ActivityLog from './ActivityLog';
import { IPTVCore } from '@/lib/iptv-core';

const IPTVConstructor = () => {
  const [core, setCore] = useState(null);
  const [servers, setServers] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    serversCount: 0,
    channelsCount: 0,
    lastScanTime: '--',
    cacheSize: '0.0 MB'
  });
  const [progress, setProgress] = useState({
    visible: false,
    title: '',
    current: 0,
    total: 0,
    percentage: 0
  });

  useEffect(() => {
    // 1. Initialize core on client-side only
    const iptv = new IPTVCore();
    setCore(iptv);
    
    // Load servers from localStorage
    const savedServers = localStorage.getItem('iptv_servers');
    if (savedServers) {
      try {
        const parsedServers = JSON.parse(savedServers);
        setServers(parsedServers);
        updateStats(parsedServers);
      } catch (error) {
        iptv.addLog('Error cargando servidores guardados', 'error');
      }
    }
    
    // Attach event listeners from the core
    const handleLog = (e) => addLog(e.detail.message, e.detail.level);
    iptv.addEventListener('log', handleLog);
    
    return () => {
      // Cleanup
      iptv.removeEventListener('log', handleLog);
      iptv.scanning = false;
    };
  }, []);

  const addLog = useCallback((message, level = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = {
      id: Date.now(),
      timestamp,
      level,
      message
    };
    
    setLogs(prevLogs => {
      const updatedLogs = [newLog, ...prevLogs.slice(0, 99)];
      return updatedLogs;
    });
    
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }, []);

  const updateStats = useCallback((serversList) => {
    const totalChannels = serversList.reduce((sum, server) => sum + (server.channels || 0), 0);
    const cacheSize = (() => {
      try {
        const totalSize = JSON.stringify(serversList).length;
        const sizeInMB = (totalSize / (1024 * 1024)).toFixed(1);
        return `${sizeInMB} MB`;
      } catch { return '0.0 MB'; }
    })();
    
    setStats({
      serversCount: serversList.length,
      channelsCount: totalChannels,
      lastScanTime: new Date().toLocaleTimeString(),
      cacheSize
    });
  }, []);

  const saveServers = useCallback((updatedServers) => {
    try {
      localStorage.setItem('iptv_servers', JSON.stringify(updatedServers));
      updateStats(updatedServers);
    } catch (error) {
      addLog('Error guardando servidores', 'error');
    }
  }, [addLog, updateStats]);

  const addServer = useCallback(async (serverData) => {
    if (!core) return { success: false, error: 'Core not initialized' };
    const newServer = {
      id: Date.now().toString(),
      ...serverData,
      channels: 0, lastScan: null, status: 'idle', protocol: null,
      categories: [], totalChannels: 0
    };
    const updatedServers = [...servers, newServer];
    setServers(updatedServers);
    saveServers(updatedServers);
    addLog(`Servidor agregado: ${serverData.name}`, 'success');
    return { success: true };
  }, [core, servers, saveServers, addLog]);

  const removeServer = useCallback((serverId) => {
    const updatedServers = servers.filter(s => s.id !== serverId);
    setServers(updatedServers);
    saveServers(updatedServers);
    addLog('Servidor eliminado', 'info');
  }, [servers, saveServers, addLog]);

  const testAllConnections = useCallback(async () => {
    if (!core) return;
    if (servers.length === 0) return addLog('No hay servidores configurados para probar', 'warning');
    addLog('Iniciando pruebas de conexión', 'info');
    for (const server of servers) {
      const result = await core.testServerConnection(server);
      const status = result.success ? 'connected' : 'error';
      const updatedServers = get().servers.map(s => s.id === server.id ? { ...s, status, protocol: result.protocol } : s);
      setServers(updatedServers);
      saveServers(updatedServers);
    }
  }, [core, servers, addLog, saveServers]);

  const scanServer = useCallback(async (server) => {
    if (!core) return;
    if (scanning) return addLog('Ya hay un escaneo en progreso', 'warning');

    setScanning(true);
    addLog(`[SCAN] Iniciando escaneo de ${server.name}`, 'info');
    
    setServers(prev => prev.map(s => s.id === server.id ? { ...s, status: 'scanning', channels: 0 } : s));
    
    const result = await core.scanServer(server);
    
    const finalServers = get().servers.map(s => {
      if (s.id === server.id) {
        return {
          ...s,
          status: result.success ? 'completed' : 'error',
          channels: result.channels,
          protocol: result.protocol,
          categories: result.categories,
          lastScan: new Date().toLocaleString()
        };
      }
      return s;
    });

    setServers(finalServers);
    saveServers(finalServers);
    setScanning(false);
  }, [core, scanning, addLog, saveServers]);

  const scanAllServers = useCallback(async () => {
    if (!core) return;
    if (scanning) return addLog('Ya hay un escaneo en progreso', 'warning');
    if (servers.length === 0) return addLog('No hay servidores configurados', 'warning');

    setScanning(true);
    setProgress({ visible: true, title: 'Escaneando servidores...', current: 0, total: servers.length, percentage: 0 });
    addLog(`[SCAN] Iniciando escaneo masivo de ${servers.length} servidor(es)`, 'info');

    for (let i = 0; i < servers.length; i++) {
      const server = servers[i];
      setProgress(prev => ({ ...prev, current: i + 1, percentage: ((i + 1) / servers.length) * 100, title: `Escaneando ${server.name}...` }));
      await scanServer(server);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    addLog(`[SCAN] Escaneo masivo completado`, 'success');
    setScanning(false);
    setProgress(prev => ({ ...prev, visible: false }));
  }, [core, scanning, servers, addLog, scanServer]);

  const clearAllData = useCallback(() => {
    if (confirm('¿Está seguro de eliminar todos los servidores y datos? Esta acción no se puede deshacer.')) {
      setServers([]);
      setLogs([]);
      localStorage.removeItem('iptv_servers');
      updateStats([]);
      addLog('Todos los datos han sido eliminados', 'warning');
    }
  }, [updateStats, addLog]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    addLog('Log limpiado', 'info');
  }, [addLog]);

  if (!core) {
    return <p className="text-center p-8">Cargando módulo IPTV…</p>;
  }

  return (
    <div className="iptv-constructor">
      <div className="header">
        <h1><span className="icon">📺</span> Constructor IPTV Pro Multi-Servidor</h1>
        <p>Sistema Inteligente con cache inteligente</p>
      </div>

      <div className="container">
        <ServerConfiguration onAddServer={addServer} onTestConnections={testAllConnections} scanning={scanning} />
        <ServersList servers={servers} onRemoveServer={removeServer} onScanServer={scanServer} scanning={scanning} />
        <div className="control-panel">
          <button className="btn btn-info" onClick={scanAllServers} disabled={scanning}><span>🔍</span> Escanear Todos los Servidores</button>
          <button className="btn btn-danger" onClick={clearAllData} disabled={scanning}><span>🗑️</span> Limpiar Todos</button>
        </div>
        <ProgressContainer progress={progress} />
        <StatsProDashboard stats={stats} />
        <ActivityLog logs={logs} onClearLogs={clearLogs} />
      </div>
    </div>
  );
};

export default IPTVConstructor;
