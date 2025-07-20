'use client';

import { useEffect } from 'react';
import { useServersStore } from '@/store/servers';
import type { Server } from '@/lib/types';
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
import { useLogsStore } from '@/store/logs';

export default function DashboardPage() {
  const {
    servers,
    actions: {
      loadInitialServers,
      addServer: addServerToStore,
      deleteServer: deleteServerFromStore,
      updateServer,
      clearServers,
    },
  } = useServersStore();

  const { addLog, clearLogs, logs } = useLogsStore();
  
  // Fake state for now, will be replaced by useScanningStore
  const isScanning = false;
  const scanProgress = 0;
  const eta = "00:00:00";
  const memoryUsage = 128;
  const totalChannelsFound = servers.reduce((acc, s) => acc + (s.activeChannels || 0), 0);

  const { toast } = useToast();

  useEffect(() => {
    loadInitialServers();
  }, [loadInitialServers]);

  const runScan = async (serversToScan: Server[]) => {
    if (isScanning) return;
    // setIsScanning(true);
    // setScanProgress(0);
    // setEta('Calculating...');
    addLog(`[INFO] Starting real scan for ${serversToScan.length} server(s).`, 'info');

    const serverIdsToScan = serversToScan.map(s => s.id);
    
    // Reset channel counts for the servers being scanned.
    serverIdsToScan.forEach(id => {
      updateServer(id, { status: 'Scanning', activeChannels: 0 });
    });

    let grandTotal = servers
      .filter(s => !serverIdsToScan.includes(s.id))
      .reduce((acc, server) => acc + (server.activeChannels || 0), 0);

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
            
            updateServer(server.id, { 
              activeChannels: channelsFound, 
              lastScan: scanDate, 
              status: 'Online' 
            });
            
            // This will be replaced by scanning store
            // setTotalChannelsFound(grandTotal);
            // const currentProgress = (i + 1) / serversToScan.length * 100;
            // setScanProgress(currentProgress);

        } catch (error: any) {
            const errorMessage = error.message || 'An unknown error occurred.';
            addLog(`[ERROR] Scan failed for ${server.name}: ${errorMessage}`, 'error');
            updateServer(server.id, { status: 'Error' });
            
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
    addLog(`[SUCCESS] Scan completed in ${scanDuration.toFixed(2)} seconds. Total channels found: ${grandTotal.toLocaleString()}`, 'success');
    
    // setIsScanning(false);
    // setScanProgress(100);
    // setEta('00:00:00');
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
    addServerToStore(server);
    addLog(`[INFO] Server added: ${server.name}`, 'info');
  };

  const deleteServer = (id: string) => {
    const serverToDelete = servers.find(s => s.id === id);
    if (serverToDelete) {
      deleteServerFromStore(id);
      addLog(`[WARN] Server deleted: ${serverToDelete.name}`, 'warning');
    }
  };
  
  const lastScan = servers.length > 0 && servers.some(s => s.lastScan && s.lastScan !== 'Never')
    ? new Date(Math.max(...servers
        .map(s => {
            if (!s.lastScan || s.lastScan === 'Never') return 0;
            const parts = s.lastScan.split(', ');
            if (parts.length < 2) return 0;
            const dateParts = parts[0].split('/');
            const timeParts = parts[1].split(/:| /);
            if (dateParts.length < 3 || timeParts.length < 3) return 0;
            
            let hours = parseInt(timeParts[0], 10);
            if (timeParts[3] && timeParts[3].toUpperCase() === 'PM' && hours < 12) {
                hours += 12;
            }
            if (timeParts[3] && timeParts[3].toUpperCase() === 'AM' && hours === 12) {
                hours = 0;
            }

            return new Date(+dateParts[2], +dateParts[0] - 1, +dateParts[1], hours, +timeParts[1], +timeParts[2]).getTime();
        }).filter(t => !isNaN(t))
    )).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '--:--:--';

  const handleClearAll = () => {
    clearServers();
    addLog('[INFO] All servers have been deleted.', 'info');
  };

  const handleClearLog = () => {
    clearLogs();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <StatsDashboard 
            serverCount={servers.length} 
            channelCount={totalChannelsFound}
            lastScanTime={lastScan}
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
              totalChannels={totalChannelsFound} 
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
