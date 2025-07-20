'use client';

import { MonitorSmartphone } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-transparent pt-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="flex items-center justify-center gap-3">
            <div className="bg-foreground p-2 rounded-md">
                <MonitorSmartphone className="h-6 w-6 text-background" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Constructor IPTV Pro Multi-Servidor - Sistema Inteligente
            </h1>
        </div>
        <p className="text-muted-foreground mt-2">
            Base de datos incremental con cache inteligente
        </p>
      </div>
    </header>
  );
}
