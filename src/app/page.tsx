'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Server, LogEntry, ScanProgress } from '@/lib/types';
import { Header } from '@/components/dashboard/header';
import { ServerList } from '@/components/dashboard/server-list';
import { ProgressOverview } from '@/components/dashboard/progress-overview';
import { ActivityLogs } from '@/components/dashboard/activity-logs';
import { AiOptimizer } from '@/components/dashboard/ai-optimizer';
import { AddServerForm } from '@/components/dashboard/add-server-form';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const initialServers: Server[] = [
  { id: '1', name: 'Main Server', url: 'http://server1.example.com', status: 'Online', activeChannels: 4892 },
  { id: '2', name: 'European Streams', url: 'http://euro.example.com', status: 'Scanning', activeChannels: 1023 },
  { id: '3', name: 'Backup Feed', url: 'http://backup.example.com', status: 'Offline', activeChannels: 0 },
  { id: '4', name: 'Test Server', url: 'http://test.example.com', status: 'Error', activeChannels: 0 },
];

const initialLogs: LogEntry[] = [
    { id: 'log1', timestamp: new Date(), message: 'System initialized and ready.', level: 'info' },
    { id: 'log2', timestamp: new Date(Date.now() - 5000), message: 'Started scan for European Streams.', level: 'info' },
    { id: 'log3', timestamp: new Date(Date.now() - 10000), message: 'Connection to Backup Feed failed: Timeout.', level: 'error' },
];

export default function DashboardPage() {
  const [servers, setServers] = useState<Server[]>(initialServers);
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    progress: 25,
    eta: '00:15:32',
    memoryUsage: 256,
    totalChannels: 5915,
  });
  const [isAddServerOpen, setAddServerOpen] = useState(false);

  const addServer = (server: Omit<Server, 'id' | 'status' | 'activeChannels'>) => {
    const newServer: Server = {
      ...server,
      id: (servers.length + 1).toString(),
      status: 'Scanning',
      activeChannels: 0,
    };
    setServers(prev => [...prev, newServer]);
    addLog(`Added new server: ${server.name}`, 'info');
    addLog(`Starting initial scan for ${server.name}...`, 'info');
  };

  const deleteServer = (id: string) => {
    const serverName = servers.find(s => s.id === id)?.name;
    setServers(prev => prev.filter(s => s.id !== id));
    if (serverName) {
      addLog(`Removed server: ${serverName}`, 'warning');
    }
  };
  
  const addLog = useCallback((message: string, level: 'info' | 'warning' | 'error') => {
    setLogs(prev => [{ id: `log${Date.now()}`, timestamp: new Date(), message, level }, ...prev].slice(0, 100));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate scan progress
      setScanProgress(prev => {
        const newProgress = prev.progress >= 100 ? 0 : prev.progress + 1;
        const newMemory = 250 + Math.random() * 50;
        const newEtaSeconds = (100 - newProgress) * 15;
        const etaDate = new Date(newEtaSeconds * 1000);
        const etaString = etaDate.toISOString().substr(11, 8);
        return {
          ...prev,
          progress: newProgress,
          memoryUsage: newMemory,
          eta: etaString,
        };
      });

      // Simulate server status changes and channel count updates
      setServers(prevServers => {
        return prevServers.map(server => {
          if (server.status === 'Scanning') {
            const newChannels = (server.activeChannels || 0) + Math.floor(Math.random() * 20);
            if (newChannels > 5000) {
              addLog(`Scan complete for ${server.name}. Found ${newChannels} channels.`, 'info');
              return { ...server, status: 'Online', activeChannels: newChannels };
            }
            return { ...server, activeChannels: newChannels };
          }
          return server;
        });
      });

    }, 1000);

    return () => clearInterval(interval);
  }, [addLog]);

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900">
      <Header onAddServer={() => setAddServerOpen(true)} />
      
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ProgressOverview {...scanProgress} />
              <ServerList servers={servers} onDeleteServer={deleteServer} />
            </div>
            <div className="lg:col-span-1 space-y-6">
              <AiOptimizer servers={servers} />
              <ActivityLogs logs={logs} />
            </div>
          </div>
        </div>
      </main>

      <Dialog open={isAddServerOpen} onOpenChange={setAddServerOpen}>
        <DialogContent>
          <AddServerForm
            onServerAdded={server => {
              addServer(server);
              setAddServerOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
