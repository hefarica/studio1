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
import { fetchXtreamCodesData } from './actions';
import { useToast } from '@/hooks/use-toast';


const initialServers: Server[] = [
  { 
    id: '1', 
    name: 'EVESTV IP TV', 
    url: 'http://126954339934.d4ktv.info:80', 
    status: 'Online', 
    activeChannels: 759,
    user: 'uqb3fbu3b',
    password: 'Password123',
    lastScan: 'Never',
  },
];

const initialLogs: LogEntry[] = [
    { id: 'log_init', timestamp: new Date(), message: '[INFO] System ready to operate.', level: 'info' },
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
  const { toast } = useToast();

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

  const runScan = async (serversToScan: Server[]) => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(0);
    setEta('Calculating...');
    addLog(`[INFO] Starting real scan for ${serversToScan.length} server(s).`, 'info');

    const channelsToReset = servers.reduce((acc, s) => {
      if (serversToScan.some(sts => sts.id === s.id)) {
          return acc + (s.activeChannels || 0);
      }
      return acc;
    }, 0);
    setTotalChannelsFound(prev => Math.max(0, prev - channelsToReset));
    
    setServers(prev => prev.map(s => serversToScan.some(sts => sts.id === s.id) ? { ...s, status: 'Scanning', activeChannels: 0 } : s));

    let grandTotal = 0;
    const scanStartTime = Date.now();

    for (const server of serversToScan) {
      try {
        addLog(`[INFO] Fetching data from ${server.name}...`, 'info');
        const streams = await fetchXtreamCodesData(server.url, server.user, server.password);
        
        const channelsFound = streams.length;
        grandTotal += channelsFound;

        addLog(`[SUCCESS] Scan of ${server.name} completed. ${channelsFound.toLocaleString()} channels found.`, 'success');
        const scanDate = new Date().toLocaleString('en-US');
        
        setServers(prevServers => prevServers.map(s =>
          s.id === server.id 
            ? { ...s, activeChannels: channelsFound, lastScan: scanDate, status: 'Online' } 
            : s
        ));
        
        setTotalChannelsFound(prevTotal => prevTotal + channelsFound);
        
        const currentProgress = (serversToScan.indexOf(server) + 1) / serversToScan.length * 100;
        setScanProgress(currentProgress);

      } catch (error: any) {
        addLog(`[ERROR] Scan failed for ${server.name}: ${error.message}`, 'error');
        setServers(prevServers => prevServers.map(s =>
          s.id === server.id ? { ...s, status: 'Error' } : s
        ));
         toast({
          variant: "destructive",
          title: "Scan Error",
          description: `Could not connect to server ${server.name}: ${error.message}`,
        });
      }
    }

    const scanDuration = (Date.now() - scanStartTime) / 1000;
    addLog(`[SUCCESS] Scan completed in ${scanDuration.toFixed(2)} seconds. Total channels found: ${grandTotal.toLocaleString()}`, 'success');
    
    setIsScanning(false);
    setScanProgress(100);
    setEta('00:00:00');
    setCacheSize(prev => prev + (Math.random() * 5));
  };


  const handleScanServer = (serverId: string) => {
    if (isScanning) return;
    const serverToScan = servers.find(s => s.id === serverId);
    if (!serverToScan) return;

    runScan([serverToScan]);
  };


  const handleScanAll = () => {
    if (isScanning || servers.length === 0) return;
    runScan(servers);
  };

  const addServer = (server: Omit<Server, 'id' | 'status' | 'activeChannels' | 'lastScan'>) => {
    const newServer: Server = {
      ...server,
      id: `server_${Date.now()}`,
      status: 'Online',
      activeChannels: 0,
      lastScan: 'Never',
    };
    setServers(prev => [...prev, newServer]);
    addLog(`[INFO] Server added: ${server.name}`, 'info');
  };

  const deleteServer = (id: string) => {
    const serverToDelete = servers.find(s => s.id === id);
    if (serverToDelete) {
      setTotalChannelsFound(prev => prev - (serverToDelete.activeChannels || 0));
      setServers(prev => prev.filter(s => s.id !== id));
      addLog(`[WARN] Server deleted: ${serverToDelete.name}`, 'warning');
    }
  };
  
  const totalChannels = servers.reduce((acc, server) => acc + (server.activeChannels || 0), 0);
  
  const lastScan = servers.length > 0 && servers.some(s => s.lastScan && s.lastScan !== 'Never')
    ? new Date(Math.max(...servers
        .map(s => {
            if (!s.lastScan || s.lastScan === 'Never') return 0;
            const parts = s.lastScan.split(', ');
            if (parts.length < 2) return 0;
            const dateParts = parts[0].split('/');
            const timeParts = parts[1].split(':');
            if (dateParts.length < 3 || timeParts.length < 3) return 0;
            return new Date(+dateParts[2], +dateParts[1] - 1, +dateParts[0], +timeParts[0], +timeParts[1], +timeParts[2]).getTime();
        })
    )).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '--:--:--';


  const handleClearAll = () => {
    setServers([]);
    setTotalChannelsFound(0);
    addLog('[INFO] All servers have been deleted.', 'info');
  }

  const handleClearLog = () => {
    setLogs([]);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <StatsDashboard 
            serverCount={servers.length} 
            channelCount={totalChannelsFound}
            lastScanTime={lastScan}
            cacheSize={cacheSize}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
             <ServerConfig onAddServer={addServer} />
             <ServerList servers={servers} onScanServer={handleScanServer} onDeleteServer={deleteServer} isScanning={isScanning} />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <ProgressOverview 
              progress={scanProgress} 
              eta={eta} 
              memoryUsage={memoryUsage}
              totalChannels={totalChannels} 
            />
            <ControlPanel 
              onScanAll={handleScanAll} 
              onClearAll={handleClearAll}
              isScanning={isScanning}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AiOptimizer />
          <ChannelExporter channelCount={totalChannelsFound} />
        </div>

        <ActivityLogs logs={logs} onClearLog={handleClearLog} />
      </main>
    </div>
  );
}
