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
  const { success, error, warning } = useNotifications();
  const { addLog, clearLogs, exportLogs } = useLogsStore();
  
  const [isClearing, setIsClearing] = useState(false);

  const handleScanAll = async () => {
    if (servers.length === 0) {
      warning('Sin servidores', 'No hay servidores configurados para escanear');
      return;
    }
    try {
      await startScan(servers.map(s => s.id));
      success('Escaneo iniciado', `Escaneando ${servers.length} servidores`);
    } catch (err: any) {
      error('Error de escaneo', err.message);
    }
  };

  const handleClearAll = async () => {
    if (isScanning) {
      error('Operación bloqueada', 'No se puede limpiar durante un escaneo');
      return;
    }
    if (confirm('¿Estás seguro de eliminar TODOS los servidores y datos?')) {
      setIsClearing(true);
      addLog('🧹 Iniciando limpieza completa...', 'warning');
      await new Promise(resolve => setTimeout(resolve, 500));
      clearAllServers();
      clearLogs();
      success('Sistema limpiado', 'Todos los datos han sido eliminados.');
      setIsClearing(false);
    }
  };

  return (
    <Card variant="elevated" className="mb-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🎮</span>
        <h2 className="text-xl font-semibold text-white">Panel de Control</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button variant="primary" onClick={handleScanAll} disabled={servers.length === 0 || isScanning} loading={isScanning} icon="🔍" className="h-12">{isScanning ? 'Escaneando...' : 'Escanear Todos'}</Button>
        {isScanning ? (
          <Button variant="danger" onClick={stopScan} icon="⏹️" className="h-12">Detener Escaneo</Button>
        ) : (
          <Button variant="info" onClick={() => { /* Export logic */ }} disabled={servers.length === 0} icon="📤" className="h-12">Exportar Datos</Button>
        )}
        <Button variant="danger" onClick={handleClearAll} disabled={servers.length === 0 || isScanning} loading={isClearing} icon="🧹" className="h-12">{isClearing ? 'Limpiando...' : 'Limpiar Todo'}</Button>
      </div>
    </Card>
  );
};