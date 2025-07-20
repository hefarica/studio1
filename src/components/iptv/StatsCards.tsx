
'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { useServersStore } from '@/store/servers';
import { useScanningStore } from '@/store/scanning';
import { useLogsStore } from '@/store/logs';
import { clsx } from 'clsx';

interface StatCardProps {
  icon: string;
  title: string;
  value: string | number;
  subtitle?: string;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  isAnimated?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ 
  icon, 
  title, 
  value, 
  subtitle, 
  color, 
  trend,
  isAnimated = false 
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (typeof value === 'number' && isAnimated) {
      let start = displayValue;
      const end = value;
      if (start === end) return;
      const duration = 1500;
      const range = end - start;
      let startTime: number | null = null;
      
      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const easedProgress = Math.pow(progress, 3); // Ease-out cubic
        const currentValue = Math.floor(easedProgress * range + start);

        setDisplayValue(currentValue);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          setDisplayValue(end);
        }
      };

      requestAnimationFrame(step);
    } else {
       setDisplayValue(typeof value === "number" ? value : 0);
    }
  }, [value, isAnimated]);


  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '';
    }
  };

  const formatValue = () => {
    if (typeof value === 'number') {
      return displayValue.toLocaleString();
    }
    return value;
  };

  return (
    <Card 
      variant="elevated" 
      className={clsx(
        'relative overflow-hidden group hover:scale-105 transition-all duration-300',
        'border-l-4',
        color
      )}
    >
      {/* Background Pattern */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
        <div className="text-6xl">{icon}</div>
      </div>

      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-3xl">{icon}</div>
          {trend && (
            <div className="text-lg opacity-60">
              {getTrendIcon()}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className={clsx('text-3xl font-bold transition-all duration-300')}>
            {formatValue()}
          </div>
          
          <div className="text-sm font-medium text-slate-300 uppercase tracking-wide">
            {title}
          </div>
          
          {subtitle && (
            <div className="text-xs text-slate-400">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
    </Card>
  );
};

export const StatsCards: React.FC = () => {
  const { stats, servers } = useServersStore();
  const { isScanning } = useScanningStore();
  const totalChannelsFound = useScanningStore(s => s.results.reduce((sum, r) => sum + r.channels, 0));
  const { logsCount, errorLogsCount } = useLogsStore();

  const [lastScanTime, setLastScanTime] = useState<string>('--');
  const [averageChannels, setAverageChannels] = useState(0);

  useEffect(() => {
    // Calculate last scan time
    const scanTimes = servers
      .map(s => s.lastScan)
      .filter((s): s is string => s !== null && s !== undefined)
      .map(time => new Date(time!))
      .sort((a, b) => b.getTime() - a.getTime());

    if (scanTimes.length > 0) {
      const latest = scanTimes[0];
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - latest.getTime()) / 60000);
      
      if (diffMinutes < 1) {
        setLastScanTime('Ahora');
      } else if (diffMinutes < 60) {
        setLastScanTime(`${diffMinutes}m ago`);
      } else {
        const diffHours = Math.floor(diffMinutes / 60);
        setLastScanTime(`${diffHours}h ago`);
      }
    } else {
      setLastScanTime('--');
    }

    // Calculate average channels per server
    const connectedServers = servers.filter(s => s.totalChannels > 0);
    if (connectedServers.length > 0) {
      const avg = connectedServers.reduce((sum, s) => sum + s.totalChannels, 0) / connectedServers.length;
      setAverageChannels(Math.round(avg));
    } else {
      setAverageChannels(0);
    }
  }, [servers]);

  const getCacheStatus = () => {
    if (!stats.cacheSize) return 'optimal';
    const sizeMatch = stats.cacheSize.match(/(\d+\.?\d*)\s*(KB|MB)/);
    if (!sizeMatch) return 'optimal';
    
    const size = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[2];
    
    if (unit === 'MB' && size > 50) return 'large';
    if (unit === 'MB' && size > 10) return 'moderate';
    return 'optimal';
  };

  const cacheStatus = getCacheStatus();
  const displayChannels = isScanning ? totalChannelsFound : stats.totalChannels;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* Servidores */}
      <StatCard
        icon="🖥️"
        title="Servidores"
        value={stats.totalServers}
        subtitle={`${stats.connectedServers} conectados`}
        color="border-l-primary-500"
        trend={stats.totalServers > 0 ? 'stable' : undefined}
        isAnimated={true}
      />

      {/* Canales */}
      <StatCard
        icon="📺"
        title="Canales"
        value={displayChannels}
        subtitle={isScanning ? 'Escaneando...' : `Promedio: ${averageChannels.toLocaleString()}/servidor`}
        color="border-l-emerald-500"
        trend={displayChannels > 0 ? 'up' : undefined}
        isAnimated={true}
      />

      {/* Último Escaneo */}
      <StatCard
        icon="⏰"
        title="Último Escaneo"
        value={lastScanTime}
        subtitle={isScanning ? 'Escaneando ahora' : 'Tiempo transcurrido'}
        color="border-l-amber-500"
        trend={isScanning ? 'up' : 'stable'}
      />

      {/* Cache/Estado del Sistema */}
      <StatCard
        icon={cacheStatus === 'large' ? '💾' : cacheStatus === 'moderate' ? '📊' : '✨'}
        title="Sistema"
        value={stats.cacheSize}
        subtitle={`${logsCount} logs, ${errorLogsCount} errores`}
        color={clsx(
          cacheStatus === 'large' ? 'border-l-warning-500' : 
          cacheStatus === 'moderate' ? 'border-l-info-500' : 
          'border-l-success-500'
        )}
        trend="stable"
      />
    </div>
  );
};
