
'use client';

import React, { useCallback, useEffect } from 'react';
import { Toaster, useToast } from '@/components/ui/toaster';
import { useServersStore } from '@/store/servers';
import { useLogsStore } from '@/store/logs';
import { useScanProgress } from '@/hooks/useScanProgress';
import type { Server } from '@/lib/types';

import { Header } from '@/components/dashboard/header';
import { ServerConfig } from '@/components/dashboard/server-config';
import { ServerList } from '@/components/dashboard/server-list';
import { ControlPanel } from '@/components/dashboard/control-panel';
import { ProgressOverview } from '@/components/dashboard/progress-overview';
import { StatsDashboard } from '@/components/dashboard/stats-dashboard';
import { ActivityLogs } from '@/components/dashboard/activity-logs';
import { AiOptimizer } from '@/components/dashboard/ai-optimizer';
import { ChannelExporter } from '@/components/dashboard/channel-exporter';

export default function DashboardPage() {
  const { servers, addServer, removeServer, clearAllServers, stats } = useServersStore();
  const { logs, addLog, clearLogs } = useLogsStore();
  const { toast } = useToast();

  const {
    startScan,
    stopScan,
    resetScan,
    scanState,
    progress,
    channelsFound,
    timeElapsed,
    timeEstimated,
  } = useScanProgress();

  useEffect(() => {
    addLog('Dashboard initialized');
  }, [addLog]);

  const handleAddServer = async (server: Omit<Server, 'id' | 'status' | 'activeChannels' | 'lastScan'>) => {
    try {
      await addServer(server);
      toast({
        title: 'Server Added',
        description: `${server.name} has been configured.`,
      });
      addLog(`Server added: ${server.name}`, 'success');
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Add Server',
        description: e.message,
      });
      addLog(`Failed to add server: ${e.message}`, 'error');
    }
  };

  const handleScanServer = useCallback((id: string) => {
    const server = servers.find(s => s.id === id);
    if (server) {
      startScan({
          username: server.username,
          password: server.password,
      });
    }
  }, [servers, startScan]);

  const handleScanAll = useCallback(() => {
    if (servers.length === 0) {
      toast({ variant: 'destructive', title: 'No servers to scan.'});
      return;
    }
    // For now, we just scan the first server as a demo of the progress system
    const firstServer = servers[0];
     startScan({
        username: firstServer.username,
        password: firstServer.password,
    });
  }, [servers, startScan]);


  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete all servers and logs?')) {
      clearAllServers();
      clearLogs();
      resetScan();
      toast({
        title: 'All Data Cleared',
        description: 'Servers and logs have been wiped.',
      });
      addLog('All data has been cleared.', 'warning');
    }
  };

  const handleDeleteServer = (id: string) => {
    const serverName = servers.find(s => s.id === id)?.name || 'Unknown';
    removeServer(id);
    toast({
      title: 'Server Removed',
      description: `Server ${serverName} has been deleted.`,
    });
    addLog(`Server removed: ${serverName}`, 'info');
  };

  return (
    <>
      <div className="min-h-screen w-full bg-background text-foreground">
        <Header />
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
            <StatsDashboard 
                serverCount={stats.totalServers} 
                channelCount={stats.totalChannels}
                lastScanTime={stats.lastScanTime || 'N/A'}
            />
          
            {scanState.isScanning && (
                <ProgressOverview 
                    progress={progress}
                    eta={new Date(timeEstimated).toISOString().slice(14, 19)}
                    memoryUsage={Math.round(Math.random() * (150-100) + 100)} // Mock data
                    totalChannels={channelsFound}
                />
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <ServerConfig onAddServer={handleAddServer} />
                <ServerList 
                    servers={servers} 
                    onScanServer={handleScanServer} 
                    onDeleteServer={handleDeleteServer} 
                    isScanning={scanState.isScanning}
                />
                <ControlPanel 
                    onScanAll={handleScanAll} 
                    onClearAll={handleClearAll} 
                    isScanning={scanState.isScanning}
                />
                <ActivityLogs logs={logs} onClearLog={clearLogs} />
              </div>
              <div className="space-y-6 lg:col-span-1">
                <AiOptimizer />
                <ChannelExporter channelCount={stats.totalChannels} />
              </div>
            </div>
        </main>
      </div>
      <Toaster />
    </>
  );
}
