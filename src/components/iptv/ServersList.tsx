'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { useServersStore } from '@/store/servers';
import { useNotifications } from '@/hooks/useNotifications';
import { useLogsStore } from '@/store/logs';
import { IPTVCore } from '@/lib/iptv-core';
import type { IPTVServer, ConnectionStatus } from '@/lib/types';
import { clsx } from 'clsx';

export const ServersList: React.FC = () => {
  const { servers, removeServer, updateServer } = useServersStore();
  const { success, error, warning } = useNotifications();
  const { addLog } = useLogsStore();
  
  const [connectionStates, setConnectionStates] = useState<Record<string, ConnectionStatus>>({});
  const [iptvCore] = useState(() => new IPTVCore());

  const updateConnectionState = useCallback((serverId: string, updates: Partial<ConnectionStatus>) => {
    setConnectionStates(prev => ({
      ...prev,
      [serverId]: { ...(prev[serverId] || { isConnecting: false, isScanning: false }), ...updates } as ConnectionStatus
    }));
  }, []);

  const testServerConnection = useCallback(async (server: IPTVServer) => {
    if (connectionStates[server.id]?.isConnecting) {
      warning('Conexión en progreso', `Ya se está probando la conexión a ${server.name}`);
      return;
    }
    
    updateConnectionState(server.id, { isConnecting: true });
    updateServer(server.id, { status: 'scanning' });
    addLog(`🔍 Probando conexión: ${server.name}`, 'info', { serverId: server.id });
  
    try {
      const result = await iptvCore.testServerConnection(server);
  
      if (result.success) {
        updateServer(server.id, { 
          status: 'connected',
          protocol: result.data.protocol,
          lastScan: new Date().toLocaleString(),
          updatedAt: new Date()
        });

        success(
          'Conexión exitosa',
          `${server.name} conectado. Protocolo: ${result.data.protocol}`,
          {
            action: {
              label: 'Escanear canales',
              onClick: () => startServerScan(server)
            }
          }
        );

        addLog(`✅ ${server.name}: Conexión exitosa. Protocolo: ${result.data.protocol}`, 'success', { serverId: server.id });
      } else {
        updateServer(server.id, { status: 'error' });
        error(`Error de conexión - ${server.name}`, result.error || 'Error desconocido');
        addLog(`❌ ${server.name}: ${result.error}`, 'error', { serverId: server.id });
      }
    } catch (err: any) {
        updateServer(server.id, { status: 'error' });
        const errorMessage = err.message || 'Error crítico desconocido';
        error('Error crítico', `${server.name}: ${errorMessage}`);
        addLog(`💥 ${server.name}: Error crítico - ${errorMessage}`, 'error', { serverId: server.id });
    } finally {
        updateConnectionState(server.id, { isConnecting: false });
    }
  }, [iptvCore, connectionStates, updateServer, addLog, success, error, warning, updateConnectionState]);

  const startServerScan = useCallback(async (server: IPTVServer) => {
    if (connectionStates[server.id]?.isScanning) {
        warning('Escaneo en progreso', `Ya se está escaneando ${server.name}`);
        return;
    }

    updateConnectionState(server.id, { isScanning: true });
    updateServer(server.id, { status: 'scanning' });
    addLog(`🚀 Iniciando escaneo completo de ${server.name}`, 'info', { serverId: server.id });
    
    try {
      const result = await iptvCore.scanServer(server);
      if (result.success) {
        updateServer(server.id, {
          status: 'completed',
          totalChannels: result.results.totalChannels,
          channels: result.results.totalChannels, // legacy support
          lastScan: new Date().toLocaleString(),
          updatedAt: new Date()
        });
        success('Escaneo completado', `${server.name}: ${result.results.totalChannels.toLocaleString()} canales encontrados.`);
        addLog(`🎉 ${server.name}: Escaneo completado - ${result.results.totalChannels} canales`, 'success', { serverId: server.id });
      } else {
        throw new Error(result.error || 'El escaneo del servidor falló');
      }
    } catch (err: any) {
      updateServer(server.id, { status: 'error' });
      const errorMessage = err.message || 'Error de escaneo desconocido';
      error('Error de escaneo', `${server.name}: ${errorMessage}`);
      addLog(`💥 ${server.name}: Error en escaneo - ${errorMessage}`, 'error', { serverId: server.id });
    } finally {
        updateConnectionState(server.id, { isScanning: false });
    }
  }, [iptvCore, connectionStates, addLog, error, success, updateServer, updateConnectionState]);

  const handleRemoveServer = (server: IPTVServer) => {
    if (confirm(`¿Estás seguro de eliminar "${server.name}"?`)) {
      removeServer(server.id);
      addLog(`🗑️ Servidor eliminado: ${server.name}`, 'warning');
      success('Servidor eliminado', `${server.name} fue eliminado correctamente`);
    }
  };

  const getStatusDisplay = (server: IPTVServer) => {
    const connectionState = connectionStates[server.id];
    
    if (connectionState?.isConnecting) return { icon: '🔄', text: `Conectando...`, color: 'text-amber-400', bgColor: 'bg-amber-900/20 border-amber-500/30' };
    if (connectionState?.isScanning) return { icon: '📡', text: `Escaneando...`, color: 'text-blue-400', bgColor: 'bg-blue-900/20 border-blue-500/30' };

    switch (server.status) {
      case 'connected': return { icon: '✅', text: `Conectado`, color: 'text-emerald-400', bgColor: 'bg-emerald-900/20 border-emerald-500/30' };
      case 'scanning': return { icon: '🔍', text: 'Escaneando...', color: 'text-blue-400', bgColor: 'bg-blue-900/20 border-blue-500/30' };
      case 'completed': return { icon: '🎯', text: `Completado - ${server.totalChannels.toLocaleString()} canales`, color: 'text-purple-400', bgColor: 'bg-purple-900/20 border-purple-500/30' };
      case 'error': return { icon: '❌', text: 'Error', color: 'text-error-400', bgColor: 'bg-error-900/20 border-error-500/30' };
      default: return { icon: '⚪', text: 'Sin probar', color: 'text-slate-400', bgColor: 'bg-slate-800/50 border-slate-600/30' };
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
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          {servers.length} servidor{servers.length !== 1 ? 'es' : ''}
        </div>
      </div>

      <div className="space-y-4">
        {servers.map((server) => {
          const status = getStatusDisplay(server);
          const connectionState = connectionStates[server.id];
          const isBusy = connectionState?.isConnecting || connectionState?.isScanning;
          
          return (
            <div
              key={server.id}
              className={clsx('rounded-lg border p-5 transition-all duration-300', 'hover:shadow-lg hover:translate-x-1', status.bgColor, isBusy && 'animate-pulse-slow')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{status.icon}</span>
                  <div>
                    <h3 className="font-semibold text-lg text-white">{server.name}</h3>
                    <p className={clsx('text-sm', status.color)}>{status.text}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isBusy && <Loading size="sm" variant="spinner" />}
                  <Button size="sm" variant="info" onClick={() => testServerConnection(server)} disabled={isBusy} icon="🔗">Probar</Button>
                  <Button size="sm" variant="secondary" onClick={() => startServerScan(server)} disabled={isBusy} icon="📡">Escanear</Button>
                  <Button size="sm" variant="danger" onClick={() => handleRemoveServer(server)} disabled={isBusy} icon="🗑️">Eliminar</Button>
                </div>
              </div>

              <div className="text-sm text-slate-300 space-y-1">
                <div className="flex items-center gap-2"><span className="text-slate-500">🌐 URL:</span><span className="font-mono text-xs break-all">{server.url}</span></div>
                <div className="flex items-center gap-2"><span className="text-slate-500">👤 Usuario:</span><span className="font-mono text-xs">{server.username}</span></div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-slate-500">🔧 Protocolo: <span className="text-slate-300">{server.protocol || 'No detectado'}</span></span>
                  <span className="text-slate-500">⏰ Último escaneo: <span className="text-slate-300">{server.lastScan || 'Nunca'}</span></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
