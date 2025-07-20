
'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { ServerConfig } from '@/components/dashboard/server-config';
import { ServerList } from '@/components/dashboard/server-list';
import { ControlPanel } from '@/components/dashboard/control-panel';
import { StatsDashboard } from '@/components/dashboard/stats-dashboard';
import { ProgressOverview } from '@/components/dashboard/progress-overview';
import { AiOptimizer } from '@/components/dashboard/ai-optimizer';
import { ActivityLogs } from '@/components/dashboard/activity-logs';
import { Toaster } from '@/components/ui/toaster';
import { useServersStore } from '@/store/servers';
import { useScanningStore } from '@/store/scanning';
import { useLogsStore } from '@/store/logs';
import { useToast } from '@/hooks/use-toast';
import { ChannelExporter } from '@/components/dashboard/channel-exporter';
import type { Server } from '@/lib/types';

export default function DashboardPage() {
  const { servers, addServer, removeServer, clearAllServers, stats } = useServersStore();
  const { isScanning, progress, startScan, stopScan } = useScanningStore();
  const { logs, clearLogs, addLog } = useLogsStore();
  const { toast } = useToast();

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    addLog('[SYSTEM] Dashboard initialized');
  }, [addLog]);

  const handleAddServer = (server: Omit<Server, 'id' | 'channels' | 'lastScan' | 'status' | 'protocol' | 'categories' | 'totalChannels' | 'createdAt' | 'updatedAt'>) => {
    // This is a simplified add. A real app would have more robust validation and feedback.
    addServer(server);
    toast({
      title: 'Server Added',
      description: `${server.name} has been configured.`,
    });
  };

  const handleScanAll = () => {
    if (servers.length === 0) {
      toast({
        title: 'No Servers',
        description: 'Please add a server before scanning.',
        variant: 'destructive',
      });
      return;
    }
    const serverIds = servers.map(s => s.id);
    startScan(serverIds);
    toast({
      title: 'Scanning Started',
      description: `Scanning ${servers.length} server(s).`,
    });
  };

  const totalChannels = stats.totalChannels || 0;

  const etaSeconds = progress.eta ? Math.round(progress.eta / 1000) : 0;
  const etaString = etaSeconds > 60
    ? `${Math.floor(etaSeconds / 60)}m ${etaSeconds % 60}s`
    : `${etaSeconds}s`;

  if (!isClient) {
    return null; // or a loading spinner
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Header />
      <main className="container mx-auto p-4 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <StatsDashboard {...stats} />
            <ServerConfig onAddServer={handleAddServer} />
            <ServerList
              servers={servers}
              onScanServer={(id) => startScan([id])}
              onDeleteServer={removeServer}
              isScanning={isScanning}
            />
            <ControlPanel
              onScanAll={handleScanAll}
              onClearAll={clearAllServers}
              isScanning={isScanning}
            />
          </div>
          <div className="space-y-6">
            <ProgressOverview
              progress={progress.percentage}
              eta={etaString}
              memoryUsage={isClient && window.performance?.memory ? Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024) : 25}
              totalChannels={progress.channelsFound}
            />
            <ChannelExporter channelCount={totalChannels} />
            <AiOptimizer />
          </div>
        </div>
        <ActivityLogs logs={logs} onClearLog={clearLogs} />
      </main>
      <Toaster />
    </div>
  );
}
