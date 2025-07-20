'use client';

import { MonitorSmartphone } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-transparent py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="flex items-center justify-center gap-4">
          <div className="bg-primary p-3 rounded-lg shadow-md">
            <MonitorSmartphone className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className='text-left'>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              IPTV Genius Scanner
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered server scanning and optimization
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
