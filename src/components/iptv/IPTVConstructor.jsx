'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ServerConfiguration from './ServerConfiguration';
import ServersList from './ServersList';
import StatsProDashboard from './StatsProDashboard';
import ProgressContainer from './ProgressContainer';
import ActivityLog from './ActivityLog';

const IPTVConstructor = () => {
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

  // Cargar servidores desde localStorage al montar
  useEffect(() => {
    try {
        const savedServers = localStorage.getItem('iptv_servers');
        if (savedServers) {
            const parsedServers = JSON.parse(savedServers);
            setServers(parsedServers);
            updateStats(parsedServers);
        }
    } catch (error) {
        addLog('Error cargando servidores guardados', 'error');
    }
  }, []);

  // Guardar servidores en localStorage
  const saveServers = useCallback((updatedServers) => {
    try {
      localStorage.setItem('iptv_servers', JSON.stringify(updatedServers));
      updateStats(updatedServers);
    } catch (error) {
      addLog('Error guardando servidores', 'error');
    }
  }, []);

  // Actualizar estadísticas
  const updateStats = useCallback((serversList) => {
    const totalChannels = serversList.reduce((sum, server) => sum + (server.channels || 0), 0);
    const cacheSize = calculateCacheSize(serversList);
    
    setStats({
      serversCount: serversList.length,
      channelsCount: totalChannels,
      lastScanTime: new Date().toLocaleTimeString(),
      cacheSize
    });
  }, []);

  // Calcular tamaño del cache
  const calculateCacheSize = (serversList) => {
    try {
      const totalSize = JSON.stringify(serversList).length;
      const sizeInMB = (totalSize / (1024 * 1024)).toFixed(1);
      return `${sizeInMB} MB`;
    } catch {
      return '0.0 MB';
    }
  };

  // Agregar log
  const addLog = useCallback((message, level = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = {
      id: Date.now(),
      timestamp,
      level,
      message
    };
    
    setLogs(prevLogs => {
      const updatedLogs = [newLog, ...prevLogs.slice(0, 99)]; // Mantener solo 100 logs
      return updatedLogs;
    });
    
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }, []);

  // Agregar servidor
  const addServer = useCallback(async (serverData) => {
    try {
      const newServer = {
        id: Date.now().toString(),
        ...serverData,
        channels: 0,
        lastScan: null,
        status: 'idle',
        protocol: null,
        categories: [],
        totalChannels: 0
      };

      const updatedServers = [...servers, newServer];
      setServers(updatedServers);
      saveServers(updatedServers);
      
      addLog(`Servidor agregado: ${serverData.name}`, 'success');
      return { success: true };
    } catch (error) {
      addLog(`Error agregando servidor: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }, [servers, saveServers, addLog]);

  // Eliminar servidor
  const removeServer = useCallback((serverId) => {
    const updatedServers = servers.filter(s => s.id !== serverId);
    setServers(updatedServers);
    saveServers(updatedServers);
    addLog('Servidor eliminado', 'info');
  }, [servers, saveServers, addLog]);

  const detectProtocol = (data) => {
    if (data.server_info && data.user_info) {
      return 'Xtream Codes';
    } else if (typeof data === 'string' && data.includes('#EXTINF')) {
      return 'M3U Plus';
    } else if (Array.isArray(data)) {
      return 'Panel API';
    } else {
      return 'Desconocido';
    }
  };
  
  // Probar conexión de servidor
  const testServerConnection = useCallback(async (server) => {
    addLog(`Probando conexión: ${server.name}`, 'info');
    
    setServers(prev => prev.map(s => s.id === server.id ? { ...s, status: 'scanning' } : s));

    try {
      const response = await fetch('/api/iptv/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: server.url, username: server.username, password: server.password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error en la petición de prueba');
      }

      const updatedServers = servers.map(s => 
        s.id === server.id 
          ? { ...s, status: 'connected', protocol: detectProtocol(result.data) }
          : s
      );
      setServers(updatedServers);
      saveServers(updatedServers);
      addLog(`✅ ${server.name}: Conexión exitosa (${result.method})`, 'success');
      return { success: true, data: result.data };
    } catch (error) {
      setServers(prev => prev.map(s => s.id === server.id ? { ...s, status: 'error' } : s));
      addLog(`❌ ${server.name}: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }, [servers, saveServers, addLog]);


  // Probar todas las conexiones
  const testAllConnections = useCallback(async () => {
    if (servers.length === 0) {
      addLog('No hay servidores configurados para probar', 'warning');
      return;
    }

    addLog('Iniciando pruebas de conexión masivas', 'info');
    setScanning(true);
    for (const server of servers) {
      await testServerConnection(server);
    }
    setScanning(false);
  }, [servers, testServerConnection, addLog]);

  // Escanear servidor individual
  const scanServer = useCallback(async (server) => {
    if (scanning) {
      addLog('Ya hay un escaneo en progreso', 'warning');
      return;
    }

    setScanning(true);
    addLog(`[SCAN] Iniciando escaneo de ${server.name}`, 'info');
    
    setServers(prev => prev.map(s => s.id === server.id ? { ...s, status: 'scanning', channels: 0 } : s));

    try {
      const response = await fetch('/api/iptv/scan-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Error escaneando el servidor`);
      }


      if (result.success) {
        const { results } = result;
        const finalServers = servers.map(s => 
          s.id === server.id 
            ? { 
                ...s, 
                status: 'completed',
                channels: results.totalChannels,
                protocol: results.protocol,
                categories: results.categories,
                lastScan: new Date().toLocaleString()
              }
            : s
        );
        
        setServers(finalServers);
        saveServers(finalServers);
        addLog(`[SCAN] ${server.name} completado: ${results.totalChannels} canales`, 'success');
      } else {
         throw new Error(result.error || `Error en el resultado del escaneo`);
      }
    } catch (error) {
      setServers(prev => prev.map(s => s.id === server.id ? { ...s, status: 'error' } : s));
      addLog(`[SCAN] Error escaneando ${server.name}: ${error.message}`, 'error');
    } finally {
      setScanning(false);
    }
  }, [servers, scanning, saveServers, addLog]);

  // Escanear todos los servidores
  const scanAllServers = useCallback(async () => {
    if (scanning) {
      addLog('Ya hay un escaneo en progreso', 'warning');
      return;
    }

    if (servers.length === 0) {
      addLog('No hay servidores configurados', 'warning');
      return;
    }

    setScanning(true);
    setProgress({
      visible: true,
      title: 'Escaneando servidores...',
      current: 0,
      total: servers.length,
      percentage: 0
    });

    addLog(`[SCAN] Iniciando escaneo masivo de ${servers.length} servidor(es)`, 'info');

    try {
      for (let i = 0; i < servers.length; i++) {
        const server = servers[i];
        
        setProgress(prev => ({
          ...prev,
          current: i + 1,
          percentage: ((i + 1) / servers.length) * 100,
          title: `Escaneando ${server.name}...`
        }));

        await scanServer(server);
        
        if (i < servers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      addLog(`[SCAN] Escaneo masivo completado`, 'success');
    } catch (error) {
      addLog(`[SCAN] Error durante escaneo masivo: ${error.message}`, 'error');
    } finally {
      setScanning(false);
      setProgress(prev => ({ ...prev, visible: false }));
    }
  }, [servers, scanning, scanServer, addLog]);

  // Limpiar todos los datos
  const clearAllData = useCallback(() => {
    if (confirm('¿Está seguro de eliminar todos los servidores y datos? Esta acción no se puede deshacer.')) {
      setServers([]);
      setLogs([]);
      localStorage.removeItem('iptv_servers');
      updateStats([]);
      addLog('Todos los datos han sido eliminados', 'warning');
    }
  }, [updateStats, addLog]);

  // Limpiar logs
  const clearLogs = useCallback(() => {
    setLogs([]);
    addLog('Log limpiado', 'info');
  }, [addLog]);

  return (
    <div className="iptv-constructor">
      {/* Header */}
      <div className="header">
        <h1>
          <span className="icon">📺</span>
          Constructor IPTV Pro Multi-Servidor
        </h1>
        <p>Sistema Inteligente con cache inteligente</p>
      </div>

      <div className="container">
        {/* Configuración de Servidor */}
        <ServerConfiguration 
          onAddServer={addServer}
          onTestConnections={testAllConnections}
          scanning={scanning}
        />

        {/* Lista de Servidores */}
        <ServersList 
          servers={servers}
          onRemoveServer={removeServer}
          onScanServer={scanServer}
          onTestConnection={testServerConnection}
          scanning={scanning}
        />

        {/* Panel de Control */}
        <div className="control-panel">
          <button 
            className="btn btn-info" 
            onClick={scanAllServers}
            disabled={scanning}
          >
            <span>🔍</span> Escanear Todos los Servidores
          </button>
          <button 
            className="btn btn-danger" 
            onClick={clearAllData}
            disabled={scanning}
          >
            <span>🗑️</span> Limpiar Todos
          </button>
        </div>

        {/* Contenedor de Progreso */}
        <ProgressContainer progress={progress} />

        {/* Dashboard de Estadísticas */}
        <StatsProDashboard stats={stats} />

        {/* Log de Actividades */}
        <ActivityLog 
          logs={logs}
          onClearLogs={clearLogs}
        />
      </div>
    </div>
  );
};

export default IPTVConstructor;
