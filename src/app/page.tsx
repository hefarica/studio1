
'use client';

import React, { useEffect } from 'react';
import { DashboardHeader } from '@/components/iptv/DashboardHeader';
import { ServerConfig } from '@/components/iptv/ServerConfig';
import { ServersList } from '@/components/iptv/ServersList';
import { ControlPanel } from '@/components/iptv/ControlPanel';
import { ProgressBar } from '@/components/iptv/ProgressBar';
import { StatsCards } from '@/components/iptv/StatsCards';
import { ActivityLog } from '@/components/iptv/ActivityLog';
import { NotificationProvider } from '@/components/providers/NotificationProvider';
import { useLogs } from '@/store/logs';
import { useServersStore } from '@/store/servers';

export default function DashboardPage() {
  const { addLog } = useLogs();
  const { refreshStats } = useServersStore();

  useEffect(() => {
    // Initialize dashboard
    addLog('🚀 Dashboard Studio1 IPTV Pro iniciado correctamente', 'success');
    addLog('📋 Sistema listo para configurar servidores IPTV', 'info');
    addLog('🔧 Manejo avanzado de errores 512 y "unexpected response" activo', 'info');
    addLog('🤖 Sistema de IA con Genkit configurado', 'info');
    
    // Refresh stats on mount
    refreshStats();
    
    // Log system info
    if (typeof window !== 'undefined') {
        const systemInfo = {
          userAgent: navigator.userAgent.slice(0, 50) + '...',
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine
        };
        
        addLog(`💻 Sistema: ${systemInfo.platform} | ${systemInfo.language} | Online: ${systemInfo.onLine}`, 'debug');
    }

    // Cleanup function
    return () => {
      addLog('📴 Dashboard cerrado', 'info');
    };
  }, [addLog, refreshStats]);

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-slate-900 text-slate-100">
        {/* Header */}
        <DashboardHeader />
        
        {/* Main Dashboard Content */}
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Server Configuration */}
          <ServerConfig />
          
          {/* Servers List */}
          <ServersList />
          
          {/* Control Panel */}
          <ControlPanel />
          
          {/* Progress Bar (only shows during scanning) */}
          <ProgressBar />
          
          {/* Statistics Cards */}
          <StatsCards />
          
          {/* Activity Log */}
          <ActivityLog />
        </main>
        
        {/* Footer */}
        <footer className="bg-dark-darker border-t border-slate-700 py-8 mt-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center text-slate-400">
              <p className="mb-2">
                Desarrollado con ❤️ para <strong className="text-primary-400">Ingenio Pichichi S.A.</strong>
              </p>
              <p className="text-sm">
                Studio1 - Constructor IPTV Pro Multi-Servidor v2.0 | 
                Sistema Inteligente con Next.js + Firebase + Genkit
              </p>
              <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  Sistema Activo
                </span>
                <span>•</span>
                <span>Manejo Error 512 ✅</span>
                <span>•</span>
                <span>IA Integrada 🤖</span>
                <span>•</span>
                <span>40K+ Canales Soportados 📺</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </NotificationProvider>
  );
}
