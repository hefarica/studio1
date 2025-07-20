'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { useServersStore } from '@/store/servers';
import { useNotifications } from '@/hooks/useNotifications';
import { useLogsStore } from '@/store/logs';
import { IPTVCore } from '@/lib/iptv-core';
import { IPTVErrorHandler } from '@/lib/error-handler';
import { SERVER_STATUS_COLORS } from '@/lib/constants';
import type { IPTVServer, ConnectionStatus } from '@/lib/types';
import { clsx } from 'clsx';

export const ServersList: React.FC = () => {
  const { servers, removeServer, updateServer } = useServersStore();
  const { success, error, warning } = useNotifications();
  const { addLog } = useLogsStore();
  
  const [connectionStates, setConnectionStates] = useState<Record<string, ConnectionStatus>>({});
  const [iptvCore] = useState(() => new IPTVCore());

  const updateConnectionState = useCallback((serverId: string, updates: Partial<ConnectionStatus>) => {
    setConnectionStates(prev => ({ ...prev, [serverId]: { ...prev[serverId], ...updates } as ConnectionStatus }));
  }, []);

  const testServerConnection = async (server: IPTVServer) => {
    if (connectionStates[server.id]?.isConnecting) {
      warning('Conexión en progreso', `Ya se está probando la conexión a ${server.name}`);
      return;
    }
    updateConnectionState(server.id, { isConnecting: true, attempts: 1, lastError: undefined, nextRetryIn: undefined });
    updateServer(server.id, { status: 'scanning' });
    addLog(`🔍 Probando conexión: ${server.name}`, 'info', { serverId: server.id });

    try {
      const result = await IPTVErrorHandler.handleRetry(() => iptvCore.testServerConnection(server, 1), { serverName: server.name, operationType: 'connection_test' }, 5);
      if (result.success) {
        updateConnectionState(server.id, { isConnecting: false, attempts: 0, lastError: undefined });
        updateServer(server.id, { status: 'connected', protocol: result.data ? iptvCore.detectProtocol(result.data) : null, lastScan: new Date().toLocaleString(), updatedAt: new Date() });
        success('Conexión exitosa', `${server.name} conectado en ${result.duration}s`);
        addLog(`✅ ${server.name}: Conectado exitosamente (${result.duration}s)`, 'success', { serverId: server.id });
      } else {
        throw new Error(result.error || 'Error de conexión desconocido');
      }
    } catch (err: any) {
      const analyzedError = IPTVErrorHandler.analyzeError(err, { serverName: server.name, url: server.url });
      updateConnectionState(server.id, { isConnecting: false, attempts: 0, lastError: analyzedError.message });
      updateServer(server.id, { status: 'error' });
      error(`Error en ${server.name}`, analyzedError.message);
      addLog(`${IPTVErrorHandler.getErrorIcon(analyzedError.code)} ${server.name}: ${analyzedError.message}`, 'error', { serverId: server.id });
    }
  };

  const handleRemoveServer = (server: IPTVServer) => {
    if (confirm(`¿Estás seguro de eliminar "${server.name}"?`)) {
      removeServer(server.id);
      addLog(`🗑️ Servidor eliminado: ${server.name}`, 'warning');
      success('Servidor eliminado', `${server.name} fue eliminado correctamente`);
    }
  };

  if (servers.length === 0) {
    return (
      <Card className="text-center py-12">
        <div className="text-6xl mb-4 opacity-50">🗂️</div>
        <h3 className="text-xl font-semibold text-slate-300 mb-2">No hay servidores configurados</h3>
        <p className="text-slate-400">Agrega tu primer servidor IPTV usando el formulario de arriba</p>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📋</span>
          <h2 className="text-xl font-semibold text-white">Servidores Configurados</h2>
        </div>
        <div className="inline-flex items-center gap-2 bg-info-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
          {servers.length} servidor{servers.length !== 1 ? 'es' : ''}
        </div>
      </div>
      <div className="space-y-4">
        {servers.map((server) => {
          const connectionState = connectionStates[server.id] || {};
          return (
            <div key={server.id} className={clsx('rounded-lg border p-5 transition-all duration-300 hover:shadow-lg', SERVER_STATUS_COLORS[server.status] || 'bg-slate-800')}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg text-white">{server.name}</h3>
                <div className="flex items-center gap-2">
                  {connectionState.isConnecting && <Loading size="sm" />}
                  <Button size="sm" variant="info" onClick={() => testServerConnection(server)} disabled={connectionState.isConnecting}>Probar</Button>
                  <Button size="sm" variant="danger" onClick={() => handleRemoveServer(server)} disabled={connectionState.isConnecting}>Eliminar</Button>
                </div>
              </div>
              <div className="text-sm text-slate-300 space-y-1">
                <p>URL: <span className="font-mono text-xs">{server.url}</span></p>
                <p>Estado: <span className="capitalize">{server.status}</span></p>
                {connectionState.lastError && <p className="text-error-400">Error: {connectionState.lastError}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};