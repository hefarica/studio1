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
import { useIPTVCore } from '@/hooks/useIPTVCore';

export const ServersList: React.FC = () => {
  const { servers, removeServer, updateServer } = useServersStore();
  const { success, error, warning } = useNotifications();
  const { addLog } = useLogsStore();
  
  const [connectionStates, setConnectionStates] = useState<Record<string, ConnectionStatus>>({});
  const { iptvCore, isReady } = useIPTVCore();

  const updateConnectionState = useCallback((serverId: string, updates: Partial<ConnectionStatus>) => {
    setConnectionStates(prev => ({
      ...prev,
      [serverId]: { ...prev[serverId], ...updates } as ConnectionStatus
    }));
  }, []);

  const testServerConnection = useCallback(async (server: IPTVServer) => {
    if (!isReady || !iptvCore) {
      error('Sistema no listo', 'IPTVCore aún no está disponible');
      return;
    }
    
    if (connectionStates[server.id]?.isConnecting) {
      warning('Conexión en progreso', `Ya se está probando la conexión a ${server.name}`);
      return;
    }

    updateConnectionState(server.id, {
      isConnecting: true,
      attempts: 1,
      lastError: undefined,
      nextRetryIn: undefined
    });

    updateServer(server.id, { status: 'scanning' });
    addLog(`🔍 Probando conexión: ${server.name}`, 'info', { serverId: server.id });

    try {
      const result = await IPTVErrorHandler.handleRetry(
        () => iptvCore.testServerConnection(server, 1),
        { serverName: server.name, operationType: 'connection_test' },
        5 // máximo 5 intentos
      );

      if (result.success) {
        updateConnectionState(server.id, {
          isConnecting: false,
          attempts: 0,
          lastError: undefined
        });

        updateServer(server.id, { 
          status: 'connected',
          protocol: result.data ? iptvCore.detectProtocol(result.data) : null,
          lastScan: new Date().toLocaleString(),
          updatedAt: new Date()
        });

        success(
          'Conexión exitosa',
          `${server.name} conectado en ${result.duration}s`,
          {
            action: {
              label: 'Escanear ahora',
              onClick: () => startServerScan(server)
            }
          }
        );

        addLog(`✅ ${server.name}: Conectado exitosamente (${result.duration}s)`, 'success', { serverId: server.id });
      } else {
        throw new Error(result.error || 'Error de conexión desconocido');
      }

    } catch (err: any) {
      const analyzedError = IPTVErrorHandler.analyzeError(err, { 
        serverName: server.name,
        url: server.url 
      });

      updateConnectionState(server.id, {
        isConnecting: false,
        attempts: 0,
        lastError: analyzedError.message
      });

      updateServer(server.id, { status: 'error' });

      error(
        `Error en ${server.name}`,
        analyzedError.message,
        {
          action: analyzedError.isRetryable ? {
            label: 'Reintentar',
            onClick: () => testServerConnection(server)
          } : undefined
        }
      );

      addLog(
        `${IPTVErrorHandler.getErrorIcon(analyzedError.code)} ${server.name}: ${analyzedError.message}`, 
        'error', 
        { serverId: server.id }
      );

      // Auto-retry para errores específicos
      if (analyzedError.isRetryable && ['SERVER_ERROR_512', 'UNEXPECTED_RESPONSE'].includes(analyzedError.code)) {
        const retryDelay = analyzedError.retryAfter || 30000;
        updateConnectionState(server.id, { nextRetryIn: retryDelay / 1000 });
        
        setTimeout(() => {
            const currentStates = connectionStates;
            if (!currentStates[server.id]?.isConnecting) {
                addLog(`🔄 Reintento automático para ${server.name}`, 'info', { serverId: server.id });
                testServerConnection(server);
            }
        }, retryDelay);
      }
    }
  }, [connectionStates, iptvCore, isReady, addLog, error, success, updateConnectionState, updateServer, warning]);

  const startServerScan = useCallback(async (server: IPTVServer) => {
    if (!isReady || !iptvCore) {
      error('Error del sistema', 'IPTVCore no está disponible');
      addLog('❌ IPTVCore no está instanciado', 'error');
      return;
    }

    if (typeof iptvCore.scanServer !== 'function') {
      error('Error del sistema', 'Método scanServer no disponible');
      addLog('❌ Método scanServer no es una función', 'error');
      return;
    }

    updateServer(server.id, { status: 'scanning' });
    addLog(`🚀 Iniciando escaneo completo de ${server.name}`, 'info', { serverId: server.id });
    
    try {
      const result = await iptvCore.scanServer(
        server,
        (progress) => {
          addLog(`📊 ${server.name}: ${progress.message}`, 'info', { 
            serverId: server.id,
            category: progress.currentCategory 
          });
          
          // Actualizar progreso en tiempo real
          if (progress.totalChannels) {
            updateServer(server.id, { 
              channels: progress.totalChannels,
              updatedAt: new Date()
            });
          }
        },
        () => false // función de stop (no implementada por ahora)
      );

      if (result.success) {
        updateServer(server.id, {
          status: 'completed',
          totalChannels: result.channels,
          channels: result.channels,
          lastScan: new Date().toLocaleString(),
          updatedAt: new Date()
        });

        success(
          'Escaneo completado',
          `${server.name}: ${result.channels} canales en ${result.duration}s`
        );

        addLog(`🎉 ${server.name}: Escaneo completado - ${result.channels} canales`, 'success', { serverId: server.id });
      } else {
        throw new Error(result.errors.join(', '));
      }

    } catch (err: any) {
      updateServer(server.id, { status: 'error' });
      error('Error de escaneo', `${server.name}: ${err.message}`);
      addLog(`💥 ${server.name}: Error en escaneo - ${err.message}`, 'error', { serverId: server.id });
    }
  }, [addLog, error, iptvCore, isReady, success, updateServer]);

  const handleRemoveServer = (server: IPTVServer) => {
    if (confirm(`¿Estás seguro de eliminar "${server.name}"?`)) {
      removeServer(server.id);
      addLog(`🗑️ Servidor eliminado: ${server.name}`, 'warning');
      success('Servidor eliminado', `${server.name} fue eliminado correctamente`);
    }
  };

  const getStatusDisplay = (server: IPTVServer) => {
    const connectionState = connectionStates[server.id];
    
    if (connectionState?.isConnecting) {
      return {
        icon: '🔄',
        text: `Conectando... (${connectionState.attempts}/5)`,
        color: 'text-amber-400',
        bgColor: 'bg-amber-900/20 border-amber-500/30'
      };
    }

    switch (server.status) {
      case 'connected':
        return {
          icon: '✅',
          text: `Conectado - ${server.channels} canales`,
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-900/20 border-emerald-500/30'
        };
      case 'scanning':
        return {
          icon: '🔍',
          text: 'Escaneando...',
          color: 'text-blue-400',
          bgColor: 'bg-blue-900/20 border-blue-500/30'
        };
      case 'completed':
        return {
          icon: '🎯',
          text: `Completado - ${server.totalChannels} canales`,
          color: 'text-purple-400',
          bgColor: 'bg-purple-900/20 border-purple-500/30'
        };
      case 'error':
        const errorState = connectionStates[server.id];
        return {
          icon: '❌',
          text: errorState?.lastError || 'Error de conexión',
          color: 'text-error-400',
          bgColor: 'bg-error-900/20 border-error-500/30'
        };
      default:
        return {
          icon: '⚪',
          text: 'Sin probar',
          color: 'text-slate-400',
          bgColor: 'bg-slate-800/50 border-slate-600/30'
        };
    }
  };

  if (servers.length === 0) {
    return (
      <Card className="text-center py-12">
        <div className="text-6xl mb-4 opacity-50">🗂️</div>
        <h3 className="text-xl font-semibold text-slate-300 mb-2">
          No hay servidores configurados
        </h3>
        <p className="text-slate-400">
          Agrega tu primer servidor IPTV usando el formulario de arriba
        </p>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📋</span>
          <h2 className="text-xl font-semibold text-white">
            Servidores Configurados
          </h2>
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
          
          return (
            <div
              key={server.id}
              className={clsx(
                'rounded-lg border p-5 transition-all duration-300',
                'hover:shadow-lg hover:translate-x-1',
                status.bgColor,
                server.status === 'scanning' && 'animate-pulse-slow'
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{status.icon}</span>
                  <div>
                    <h3 className="font-semibold text-lg text-white">
                      {server.name}
                    </h3>
                    <p className={clsx('text-sm', status.color)}>
                      {status.text}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {connectionState?.isConnecting && (
                    <Loading size="sm" variant="spinner" />
                  )}
                  
                  <Button
                    size="sm"
                    variant="info"
                    onClick={() => testServerConnection(server)}
                    disabled={connectionState?.isConnecting || server.status === 'scanning'}
                    icon="🔍"
                  >
                    Probar
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => startServerScan(server)}
                    disabled={connectionState?.isConnecting || server.status === 'scanning'}
                    icon="📡"
                  >
                    Escanear
                  </Button>

                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleRemoveServer(server)}
                    disabled={connectionState?.isConnecting || server.status === 'scanning'}
                    icon="🗑️"
                  >
                    Eliminar
                  </Button>
                </div>
              </div>

              {/* Server Info */}
              <div className="text-sm text-slate-300 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">🌐 URL:</span>
                  <span className="font-mono text-xs break-all">{server.url}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">👤 Usuario:</span>
                  <span className="font-mono text-xs">{server.username}</span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-slate-500">🔧 Protocolo: <span className="text-slate-300">{server.protocol || 'No detectado'}</span></span>
                  <span className="text-slate-500">⏰ Último escaneo: <span className="text-slate-300">{server.lastScan || 'Nunca'}</span></span>
                </div>
              </div>

              {/* Error Info */}
              {connectionState?.lastError && server.status === 'error' && (
                <div className="mt-4 p-3 bg-error-900/30 border border-error-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-error-400 text-lg flex-shrink-0">🔧</span>
                    <div>
                      <h4 className="text-sm font-semibold text-error-300 mb-1">
                        Diagnóstico del Error:
                      </h4>
                      <p className="text-xs text-error-200 mb-2">
                        {connectionState.lastError}
                      </p>
                      
                      <div className="text-xs text-error-200/80">
                        <strong>Soluciones sugeridas:</strong>
                        <ul className="mt-1 space-y-1 list-disc list-inside">
                          <li>Verificar URL y credenciales del servidor</li>
                          <li>Comprobar conectividad de red</li>
                          <li>El sistema reintentará automáticamente</li>
                          <li>Contactar al proveedor IPTV si persiste</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-600/30">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-xs text-slate-400">
                    <span className={clsx('font-semibold', server.channels > 0 ? 'text-emerald-400' : 'text-slate-400')}>
                      {server.channels}
                    </span> canales
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-xs text-slate-400">
                    <span className="font-semibold text-blue-400">{server.categories.length}</span> categorías
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={clsx('w-2 h-2 rounded-full', SERVER_STATUS_COLORS[server.status])}></span>
                  <span className="text-xs text-slate-400 capitalize">{server.status}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
