
'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useScanningStore } from '@/store/scanning';
import { clsx } from 'clsx';

export const ProgressBar: React.FC = () => {
  const { 
    isScanning, 
    progress, 
    stopScan, 
  } = useScanningStore();

  const totalChannelsFound = useScanningStore(s => s.results.reduce((sum, r) => sum + r.channels, 0));
  
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  // Animar el porcentaje suavemente
  useEffect(() => {
    if (isScanning) {
      const timer = setTimeout(() => {
        setAnimatedPercentage(progress.percentage);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // Allow animation to finish
      setTimeout(() => {
        if (!isScanning) setAnimatedPercentage(0);
      }, 1000);
    }
  }, [progress.percentage, isScanning]);

  const formatDuration = () => {
      if (!progress.startTime) return '--';
      const elapsed = Date.now() - progress.startTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const formatETA = () => {
      if (!progress.eta || progress.percentage >= 100) return '--';
      const minutes = Math.floor(progress.eta / 60000);
      const seconds = Math.floor((progress.eta % 60000) / 1000);
      return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };


  if (!isScanning && progress.percentage === 0) {
    return null;
  }

  const getProgressColor = () => {
    if (progress.percentage < 25) return 'from-blue-600 to-blue-500';
    if (progress.percentage < 50) return 'from-emerald-600 to-emerald-500';
    if (progress.percentage < 75) return 'from-amber-600 to-amber-500';
    return 'from-purple-600 to-purple-500';
  };

  const getProgressText = () => {
    if (progress.percentage >= 100) return '¡Escaneo finalizado!';
    if (progress.currentCategory) {
      return `Procesando: ${progress.currentCategory}`;
    }
    if (progress.currentServer) {
      return `Escaneando: ${progress.currentServer}`;
    }
    return 'Preparando escaneo...';
  };

  return (
    <Card 
      id="scan-progress" 
      variant="elevated" 
      className={clsx(
        'mb-6 transition-all duration-500',
        isScanning ? 'opacity-100' : 'opacity-75'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className={clsx("text-2xl", isScanning && 'animate-spin')}>⚡</span>
          <div>
            <h3 className="text-lg font-semibold text-white">
              {isScanning ? 'Escaneo en Progreso' : 'Escaneo Completado'}
            </h3>
            <p className="text-sm text-slate-400">
              {getProgressText()}
            </p>
          </div>
        </div>

        {isScanning && (
          <Button
            size="sm"
            variant="danger"
            onClick={stopScan}
            icon="⏹️"
          >
            Detener
          </Button>
        )}
      </div>

      {/* Main Progress Bar */}
      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-300 font-medium">
            Progreso General
          </span>
          <span className="text-slate-400">
            {progress.current} / {progress.total} servidores ({animatedPercentage.toFixed(1)}%)
          </span>
        </div>

        <div className="relative w-full h-4 bg-slate-700 rounded-full overflow-hidden shadow-inner">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden',
              `bg-gradient-to-r ${getProgressColor()}`
            )}
            style={{ width: `${animatedPercentage}%` }}
          >
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
          
          {/* Progress text overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-white drop-shadow-lg">
              {animatedPercentage.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-slate-700/50 rounded-lg p-3 text-center border border-slate-600/30">
          <div className="text-lg font-bold text-emerald-400">
            {totalChannelsFound.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-wide">
            Canales Encontrados
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-3 text-center border border-slate-600/30">
          <div className="text-lg font-bold text-blue-400">
            {progress.current}
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-wide">
            Servidores Procesados
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-3 text-center border border-slate-600/30">
          <div className="text-lg font-bold text-amber-400">
            {formatDuration()}
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-wide">
            Tiempo Transcurrido
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-3 text-center border border-slate-600/30">
          <div className="text-lg font-bold text-purple-400">
            {formatETA()}
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-wide">
            Tiempo Estimado
          </div>
        </div>
      </div>

      {/* Detailed Progress */}
      {isScanning && progress.currentServer && (
        <div className="mt-6 pt-4 border-t border-slate-600/30">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-300">
              📡 {progress.currentServer}
            </span>
            {progress.currentCategory && (
              <span className="text-slate-400">
                📂 {progress.currentCategory}
              </span>
            )}
          </div>
          
          {/* Server specific progress bar */}
          <div className="w-full h-2 bg-slate-600 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
              style={{ 
                width: `${((progress.current - 1) / progress.total + (1 / progress.total) * 0.5) * 100}%` 
              }}
            />
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {isScanning && progress.startTime && (
        <div className="mt-4 text-xs text-slate-500 flex items-center justify-between">
          <span>
            🚀 Velocidad: ~{Math.round((totalChannelsFound || 1) / ((Date.now() - progress.startTime) / 60000))} canales/min
          </span>
          <span>
            💾 Procesados: {((progress.current / progress.total) * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </Card>
  );
};
