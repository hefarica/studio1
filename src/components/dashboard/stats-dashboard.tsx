
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Stats } from '@/lib/types';
import { Server, Tv, Clock, HardDrive } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useServersStore } from '@/store/servers';


export function StatsDashboard({ serverCount = 0, channelCount = 0, lastScanTime }: Omit<Stats, 'cacheSize'>) {
  
  const [isClient, setIsClient] = useState(false);
  const {cacheSize} = useServersStore(s => s.stats);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const stats = [
    { 
      label: 'Servers', 
      value: serverCount, 
      icon: Server,
    },
    { 
      label: 'Channels', 
      value: isClient ? channelCount.toLocaleString('en-US') : '...', 
      icon: Tv,
    },
    { 
      label: 'Last Scan', 
      value: lastScanTime, 
      icon: Clock,
    },
    { 
      label: 'Cache Size', 
      value: isClient ? `${cacheSize}` : '...', 
      icon: HardDrive,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="shadow-sm">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">{stat.label}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
