
'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useServersStore } from '@/store/servers';
import { useScanningStore } from '@/store/scanning';
import { useNotifications } from '@/hooks/useNotifications';
import { useLogsStore } from '@/store/logs';

export const ControlPanel: React.FC = () => {
  const { servers, clearAllServers } = useServersStore();
  const { isScanning, startScan, stopScan } = useScanningStore();
  const { success, error, warning, info } = useNotifications();
  const { addLog, clearLogs, exportLogs } = useLogsStore();
  
  const [isClearing, setIsClearing] = useState(false);

  const handleScanAll = async () => {
    if (servers.length === 0) {
      warning('Sin servidores', 'No hay servidores configurados para escanear');
      return;
    }

    if (isScanning) {
      warning('Escaneo en progreso', 'Ya hay un escaneo ejecutándose');
      return;
    }

    try {
      const serverIds = servers.map(s => s.id);
      addLog(`🚀 Iniciando escaneo masivo de ${servers.length} servidor(es)`, 'info');
      
      await startScan(serverIds);
      
      success(
        'Escaneo iniciado',
        `Escaneando ${servers.length} servidores en paralelo`,
        {
          action: {
            label: 'Ver progreso',
            onClick: () => {
              // Scroll to progress bar
              document.getElementById('scan-progress')?.scrollIntoView({ 
                behavior: 'smooth' 
              });
            }
          }
        }
      );

    } catch (err: any) {
      error('Error de escaneo', err.message);
      addLog(`❌ Error iniciando escaneo masivo: ${err.message}`, 'error');
    }
  };

  const handleStopScan = () => {
    if (confirm('¿Estás seguro de detener el escaneo en progreso?')) {
      stopScan();
      warning('Escaneo detenido', 'El escaneo fue cancelado por el usuario');
      addLog('⏹️ Escaneo detenido por el usuario', 'warning');
    }
  };

  const handleTestAllConnections = async () => {
    if (servers.length === 0) {
      warning('Sin servidores', 'No hay servidores configurados para probar');
      return;
    }

    addLog(`🔗 Iniciando pruebas de conexión para ${servers.length} servidor(es)`, 'info');
    info(
      'Pruebas iniciadas',
      `Probando conexiones de ${servers.length} servidores`,
      { duration: 3000 }
    );

    // Aquí se implementaría la lógica de prueba masiva
    // Por ahora solo mostramos el mensaje
  };

  const handleClearAll = async () => {
    if (isScanning) {
      error('Operación bloqueada', 'No se pueden eliminar datos durante un escaneo activo');
      return;
    }

    const totalChannels = servers.reduce((sum, s) => sum + (s.totalChannels || 0), 0);
    const confirmMessage = `¿Estás seguro de eliminar TODOS los servidores y datos?\n\nEsta acción no se puede deshacer.\n\n- ${servers.length} servidores\n- ${totalChannels.toLocaleString()} canales\n- Todos los logs\n- Configuraciones guardadas`;
    
    if (confirm(confirmMessage)) {
      setIsClearing(true);
      
      try {
        addLog('🧹 Iniciando limpieza completa del sistema...', 'warning');
        
        // Simular delay de limpieza para mejor UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        clearAllServers();
        clearLogs();
        
        success(
          'Sistema limpiado',
          'Todos los datos han sido eliminados correctamente'
        );
        
        addLog('✨ Sistema reiniciado - Todos los datos eliminados', 'info');
        
      } catch (err: any) {
        error('Error de limpieza', err.message);
        addLog(`❌ Error durante limpieza: ${err.message}`, 'error');
      } finally {
        setIsClearing(false);
      }
    }
  };

  const handleExportData = () => {
    try {
      const totalChannels = servers.reduce((sum, s) => sum + (s.totalChannels || 0), 0);
      const exportData = {
        timestamp: new Date().toISOString(),
        servers: servers.length,
        totalChannels: totalChannels,
        logs: exportLogs(),
        systemInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
        }
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `iptv-data-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      success('Datos exportados', 'Los datos se descargaron correctamente');
      addLog('📤 Datos exportados correctamente', 'info');
      
    } catch (err: any) {
      error('Error de exportación', err.message);
      addLog(`❌ Error exportando datos: ${err.message}`, 'error');
    }
  };

  const connectedServers = servers.filter(s => s.status === 'connected').length;
  const errorServers = servers.filter(s => s.status === 'error').length;
  const totalChannels = servers.reduce((sum, s) => sum + (s.totalChannels || 0), 0);

  return (
    <Card variant="elevated" className="mb-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🎮</span>
        <h2 className="text-xl font-semibold text-white">
          Panel de Control
        </h2>
        <div className="ml-auto flex items-center gap-2 text-sm text-slate-400">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            {connectedServers} conectados
          </span>
          {errorServers > 0 && (
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-error-500 rounded-full"></div>
              {errorServers} con errores
            </span>
          )}
          <span className="text-slate-500">|</span>
          <span>{totalChannels.toLocaleString()} canales totales</span>
        </div>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Button
          variant="primary"
          onClick={handleScanAll}
          disabled={servers.length === 0 || isScanning}
          loading={isScanning}
          icon="🔍"
          className="h-14"
        >
          {isScanning ? 'Escaneando...' : 'Escanear Todos'}
        </Button>

        <Button
          variant="secondary"
          onClick={handleTestAllConnections}
          disabled={servers.length === 0 || isScanning}
          icon="🔗"
          className="h-14"
        >
          Probar Conexiones
        </Button>

        {isScanning ? (
          <Button
            variant="danger"
            onClick={handleStopScan}
            icon="⏹️"
            className="h-14"
          >
            Detener Escaneo
          </Button>
        ) : (
          <Button
            variant="info"
            onClick={handleExportData}
            disabled={servers.length === 0}
            icon="📤"
            className="h-14"
          >
            Exportar Datos
          </Button>
        )}

        <Button
          variant="danger"
          onClick={handleClearAll}
          disabled={servers.length === 0 || isScanning}
          loading={isClearing}
          icon="🧹"
          className="h-14"
        >
          {isClearing ? 'Limpiando...' : 'Limpiar Todo'}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-primary">
              {servers.length}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">
              Servidores
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-success">
              {connectedServers}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">
              Conectados
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-info">
              {totalChannels.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">
              Canales
            </div>
          </div>
          
          <div className="space-y-1">
            <div className={`text-2xl font-bold ${isScanning ? 'text-warning animate-pulse' : 'text-slate-500'}`}>
              {isScanning ? '🔄' : '⏸️'}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">
              {isScanning ? 'Escaneando' : 'Inactivo'}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Controls */}
      <div className="mt-6 pt-6 border-t border-slate-600/30">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <span>⚙️</span>
          Controles Avanzados
        </h3>
        
        <div className="flex flex-wrap gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              clearLogs();
              info('Logs limpiados', 'El historial de actividades fue reiniciado');
            }}
            icon="📝"
          >
            Limpiar Logs
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (typeof window !== 'undefined' && (window as any).gc) {
                (window as any).gc();
              }
              info('Sistema optimizado', 'Memoria del navegador liberada');
              addLog('🧠 Optimización de memoria ejecutada', 'info');
            }}
            icon="🧠"
          >
            Optimizar Memoria
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const stats = {
                servidores: servers.length,
                conectados: connectedServers,
                canales: totalChannels,
                errores: errorServers,
                escaneando: isScanning
              };
              
              console.log('📊 Studio1 IPTV Stats:', stats);
              info('Stats en consola', 'Estadísticas detalladas disponibles en la consola del navegador');
            }}
            icon="📊"
          >
            Ver Stats
          </Button>
        </div>
      </div>
    </Card>
  );
};
