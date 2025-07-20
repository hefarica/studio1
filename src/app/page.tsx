'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Server, LogEntry } from '@/lib/types';
import { Header } from '@/components/dashboard/header';
import { ServerList } from '@/components/dashboard/server-list';
import { StatsDashboard } from '@/components/dashboard/stats-dashboard';
import { ActivityLogs } from '@/components/dashboard/activity-logs';
import { ServerConfig } from '@/components/dashboard/server-config';
import { ControlPanel } from '@/components/dashboard/control-panel';
import { ProgressOverview } from '@/components/dashboard/progress-overview';
import { AiOptimizer } from '@/components/dashboard/ai-optimizer';
import { ChannelExporter } from '@/components/dashboard/channel-exporter';

const initialServers: Server[] = [
  { 
    id: '1', 
    name: 'EVESTV IP TV', 
    url: 'http://126954339934.d4ktv.info:80', 
    status: 'Online', 
    activeChannels: 0,
    user: 'uqb3fbu3b',
    lastScan: 'Nunca',
  },
];

const initialLogs: LogEntry[] = [
    { id: 'log_init', timestamp: new Date(), message: '[INFO] Sistema listo para operar.', level: 'info' },
];

export default function DashboardPage() {
  const [servers, setServers] = useState<Server[]>(initialServers);
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [cacheSize, setCacheSize] = useState(0.0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [eta, setEta] = useState('00:00:00');
  const [totalChannelsFound, setTotalChannelsFound] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(128);

  useEffect(() => {
    const initialTotalChannels = servers.reduce((acc, server) => acc + (server.activeChannels || 0), 0);
    setTotalChannelsFound(initialTotalChannels);
  }, [servers]);

  const addLog = useCallback((message: string, level: 'info' | 'warning' | 'error' | 'success') => {
    const timestamp = new Date();
    const timeString = `[${timestamp.getHours().toString().padStart(2,'0')}:${timestamp.getMinutes().toString().padStart(2,'0')}:${timestamp.getSeconds().toString().padStart(2,'0')}]`;
    const formattedMessage = `${timeString} ${message}`;
    const newLogId = `log${Date.now()}${Math.random()}`;
    setLogs(prev => [{ id: newLogId, timestamp: timestamp, message: formattedMessage, level }, ...prev].slice(0, 100));
  }, []);

  const handleScanAll = () => {
    if (isScanning || servers.length === 0) return;

    setIsScanning(true);
    setScanProgress(0);
    addLog('[INFO] Iniciando escaneo de todos los servidores...', 'info');

    // Reiniciar canales de cada servidor y el contador global antes de escanear
    setTotalChannelsFound(0);
    setServers(prevServers => prevServers.map(s => ({ ...s, activeChannels: 0, status: 'Scanning' })));

    const totalDuration = 5 * 60 * 1000;
    const totalChannelsToFind = 40127;
    const intervalTime = 250; 
    const steps = totalDuration / intervalTime;
    let currentStep = 0;
    let channelsFoundSoFar = 0;

    const scanInterval = setInterval(() => {
      currentStep++;
      const progress = (currentStep / steps) * 100;
      setScanProgress(progress);
      
      const remainingTime = totalDuration - (currentStep * intervalTime);
      const etaDate = new Date(remainingTime);
      const mm = String(etaDate.getUTCMinutes()).padStart(2, '0');
      const ss = String(etaDate.getUTCSeconds()).padStart(2, '0');
      setEta(`00:${mm}:${ss}`);
      
      const newChannelsThisStep = Math.floor(Math.random() * (totalChannelsToFind / steps) * 2);
      channelsFoundSoFar += newChannelsThisStep;
      setTotalChannelsFound(Math.min(channelsFoundSoFar, totalChannelsToFind));
      setMemoryUsage(150 + Math.floor(Math.random() * 50)); 

      if (currentStep % 20 === 0) {
        addLog(`[INFO] Escaneo en progreso: ${Math.round(progress)}%. Canales encontrados: ${totalChannelsFound.toLocaleString()}`, 'info');
      }

      if (progress >= 100) {
        clearInterval(scanInterval);
        setIsScanning(false);
        setEta('00:00:00');
        setTotalChannelsFound(totalChannelsToFind);
        addLog(`[SUCCESS] Escaneo completado. Total de canales encontrados: ${totalChannelsToFind.toLocaleString()}`, 'success');
        
        const scanDate = new Date().toLocaleString('es-ES');
        setServers(prevServers => prevServers.map(s => ({
          ...s,
          activeChannels: Math.floor(totalChannelsToFind / prevServers.length),
          lastScan: scanDate,
          status: 'Online'
        })));
        setCacheSize(prev => prev + (Math.random() * 5));
      }
    }, intervalTime);
  };

  const addServer = (server: Omit<Server, 'id' | 'status' | 'activeChannels' | 'lastScan'>) => {
    const newServer: Server = {
      ...server,
      id: (servers.length + 1).toString(),
      status: 'Online',
      activeChannels: 0,
      lastScan: new Date().toLocaleString('es-ES'),
    };
    setServers(prev => [...prev, newServer]);
    addLog(`[INFO] Servidor agregado: ${server.name}`, 'info');
  };

  const deleteServer = (id: string) => {
    const serverName = servers.find(s => s.id === id)?.name;
    setServers(prev => prev.filter(s => s.id !== id));
    if (serverName) {
      addLog(`[WARN] Servidor eliminado: ${serverName}`, 'warning');
    }
  };
  
  const totalChannels = servers.reduce((acc, server) => acc + (server.activeChannels || 0), 0);
  
  const lastScan = servers.length > 0 && servers.some(s => s.lastScan && s.lastScan !== 'Nunca')
    ? new Date(Math.max(...servers
        .map(s => {
            if (!s.lastScan || s.lastScan === 'Nunca') return 0;
            const parts = s.lastScan.split(', ');
            if (parts.length < 2) return 0;
            const dateParts = parts[0].split('/');
            const timeParts = parts[1].split(':');
            if (dateParts.length < 3 || timeParts.length < 3) return 0;
            return new Date(+dateParts[2], +dateParts[1] - 1, +dateParts[0], +timeParts[0], +timeParts[1], +timeParts[2]).getTime();
        })
    )).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '--:--:--';


  const handleClearAll = () => {
    setServers([]);
    addLog('[INFO] Todos los servidores han sido eliminados.', 'info');
  }

  const handleClearLog = () => {
    setLogs([]);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
             <ServerConfig onAddServer={addServer} />
             <ServerList servers={servers} onDeleteServer={deleteServer} />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <ProgressOverview 
              progress={scanProgress} 
              eta={eta} 
              memoryUsage={memoryUsage}
              totalChannels={totalChannelsFound} 
            />
          </div>
        </div>
        
        <ControlPanel 
          onScanAll={handleScanAll} 
          onClearAll={handleClearAll}
          isScanning={isScanning}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AiOptimizer />
          <ChannelExporter channelCount={totalChannelsFound} />
        </div>

        <StatsDashboard 
            serverCount={servers.length} 
            channelCount={totalChannelsFound}
            lastScanTime={lastScan}
            cacheSize={cacheSize}
        />
        <ActivityLogs logs={logs} onClearLog={handleClearLog} />
      </main>
    </div>
  );
}
