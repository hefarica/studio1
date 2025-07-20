'use client';

import { DashboardHeader } from '@/components/iptv/DashboardHeader';
import { ServerConfig } from '@/components/iptv/ServerConfig';
import { ServersList } from '@/components/iptv/ServersList';
import { ControlPanel } from '@/components/iptv/ControlPanel';
import { Toaster } from 'react-hot-toast';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Toaster position="top-right" />
      <DashboardHeader />
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <ServerConfig />
        <ServersList />
        <ControlPanel />
        {/* Aquí irían los demás componentes como ProgressBar, StatsCards, ActivityLog */}
      </main>
    </div>
  );
}