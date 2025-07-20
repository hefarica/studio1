'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { Stats } from '@/lib/types';
import { Server, Tv, Clock, HardDrive } from 'lucide-react';
import { useEffect, useState } from 'react';

export function StatsDashboard({ serverCount, channelCount, lastScanTime, cacheSize }: Stats) {
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const stats = [
    { 
      label: 'SERVIDORES', 
      value: serverCount, 
      icon: Server,
      'data-ai-hint': 'server icon'
    },
    { 
      label: 'CANALES', 
      value: isClient ? channelCount.toLocaleString('es-ES') : '...', 
      icon: Tv,
      'data-ai-hint': 'television screen'
    },
    { 
      label: 'ÚLTIMO ESCANEO', 
      value: lastScanTime, 
      icon: Clock,
      'data-ai-hint': 'clock time'
    },
    { 
      label: 'CACHE', 
      value: isClient ? `${cacheSize.toFixed(1)} MB` : '...', 
      icon: HardDrive,
      'data-ai-hint': 'hard drive'
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-card shadow-lg rounded-lg text-center p-4">
          <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground uppercase">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
