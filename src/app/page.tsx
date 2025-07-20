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

const initialServers: Server[] = [
  { 
    id: '1', 
    name: 'EVESTV IP TV', 
    url: 'http://126954339934.d4ktv.info:80', 
    status: 'Online', 
    activeChannels: 39860,
    user: 'uqb3fbu3b',
    lastScan: '19/7/2025, 21:03:14',
  },
];

const initialLogs: LogEntry[] = [
    { id: 'log1', timestamp: new Date(Date.now() - 2000), message: '[0:02:56] [INFO]', level: 'info' },
];

export default function DashboardPage() {
  const [servers, setServers] = useState<Server[]>(initialServers);
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [cacheSize, setCacheSize] = useState(0.0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, [])

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
  
  const addLog = useCallback((message: string, level: 'info' | 'warning' | 'error') => {
    const timestamp = new Date();
    const timeString = `[${timestamp.getHours().toString().padStart(2,'0')}:${timestamp.getMinutes().toString().padStart(2,'0')}:${timestamp.getSeconds().toString().padStart(2,'0')}]`;
    const formattedMessage = `${timeString} ${message}`;
    setLogs(prev => [{ id: `log${Date.now()}`, timestamp: timestamp, message: formattedMessage, level }, ...prev].slice(0, 100));
  }, []);
  
  const totalChannels = servers.reduce((acc, server) => acc + (server.activeChannels || 0), 0);
  const lastScan = servers.length > 0 ? servers.reduce((latest, s) => {
      // Basic date parsing, might need adjustment for the exact format
      const parts = s.lastScan?.split(', ');
      if (!parts || parts.length < 2) return latest;
      const dateParts = parts[0].split('/');
      const timeParts = parts[1].split(':');
      if (dateParts.length < 3 || timeParts.length < 3) return latest;
      const sDate = new Date(+dateParts[2], +dateParts[1] - 1, +dateParts[0], +timeParts[0], +timeParts[1], +timeParts[2]);
      return sDate > latest ? sDate : latest;
  }, new Date(0)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '--:--:--';


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
      
      <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
             <ServerConfig onAddServer={addServer} />
             <ServerList servers={servers} onDeleteServer={deleteServer} />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <ProgressOverview progress={25} eta="00:15:32" memoryUsage={256} totalChannels={5915} />
          </div>
        </div>
        
        <ControlPanel onScanAll={() => addLog('[INFO] Escaneando todos los servidores...','info')} onClearAll={handleClearAll} />
        
        <StatsDashboard 
            serverCount={servers.length} 
            channelCount={totalChannels}
            lastScanTime={lastScan}
            cacheSize={cacheSize}
        />
        <ActivityLogs logs={logs} onClearLog={handleClearLog} />
      </main>
    </div>
  );
}
