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
    activeChannels: 0,
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

    const serverIdsToScan = serversToScan.map(s => s.id);
    
    // Reset channel counts for the servers being scanned.
    setServers(prev => prev.map(s => 
      serverIdsToScan.includes(s.id) 
        ? { ...s, status: 'Scanning', activeChannels: 0 } 
        : s
    ));
    // Recalculate total channels based on non-scanned servers
    const remainingChannels = servers
      .filter(s => !serverIdsToScan.includes(s.id))
      .reduce((acc, server) => acc + (server.activeChannels || 0), 0);
    setTotalChannelsFound(remainingChannels);

    let grandTotal = remainingChannels;
    const scanStartTime = Date.now();

    for (let i = 0; i < serversToScan.length; i++) {
        const server = serversToScan[i];
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
            
            const currentProgress = (i + 1) / serversToScan.length * 100;
            setScanProgress(currentProgress);

        } catch (error: any) {
            const errorMessage = error.message || 'An unknown error occurred.';
            addLog(`[ERROR] Scan failed for ${server.name}: ${errorMessage}`, 'error');
            setServers(prevServers => prevServers.map(s =>
              s.id === server.id ? { ...s, status: 'Error' } : s
            ));
            
            let toastDescription = `Please check the server URL and credentials. Details: ${errorMessage}`;
            if (errorMessage.includes('512')) {
                toastDescription = "The server reported an internal error (512). This is often temporary. Please wait a few minutes and try again.";
            } else if (errorMessage.includes('timeout')) {
                toastDescription = "The connection to the server timed out. This could be due to network issues or the server being slow to respond.";
            }

            toast({
                variant: "destructive",
                title: `Scan Error for ${server.name}`,
                description: toastDescription,
            });
        }
    }

    const scanDuration = (Date.now() - scanStartTime) / 1000;
    addLog(`[SUCCESS] Scan completed in ${scanDuration.toFixed(2)} seconds. Total channels found: ${totalChannelsFound.toLocaleString()}`, 'success');
    
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
            // Robust date parsing for 'M/D/YYYY, HH:MM:SS' format
            const parts = s.lastScan.split(', ');
            if (parts.length < 2) return 0;
            const dateParts = parts[0].split('/');
            const timeParts = parts[1].split(/:| /); // Handles both HH:MM:SS and HH:MM:SS AM/PM
            if (dateParts.length < 3 || timeParts.length < 3) return 0;
            
            let hours = parseInt(timeParts[0], 10);
            if (timeParts[3] && timeParts[3].toUpperCase() === 'PM' && hours < 12) {
                hours += 12;
            }
            if (timeParts[3] && timeParts[3].toUpperCase() === 'AM' && hours === 12) {
                hours = 0;
            }

            // new Date(year, monthIndex, day, hours, minutes, seconds)
            return new Date(+dateParts[2], +dateParts[0] - 1, +dateParts[1], hours, +timeParts[1], +timeParts[2]).getTime();
        }).filter(t => !isNaN(t))
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
