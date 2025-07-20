'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BrainCircuit, Clock, MemoryStick, Tv } from 'lucide-react';
import { useState, useEffect } from 'react';

type ProgressOverviewProps = {
  progress: number;
  eta: string;
  memoryUsage: number;
  totalChannels: number;
};

export function ProgressOverview({
  progress,
  eta,
  memoryUsage,
  totalChannels,
}: ProgressOverviewProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <Card className="bg-card shadow-lg rounded-lg text-card-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BrainCircuit className="h-5 w-5" />
          Progreso del Escaneo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progreso</span>
              <span className="text-sm font-bold text-accent">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full h-2" />
            <div className="text-xs text-muted-foreground mt-1 text-right">
              ETA: {eta}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <Tv className="h-6 w-6 mx-auto text-accent" />
              <p className="mt-2 text-xs text-muted-foreground uppercase">Canales Activos</p>
              <p className="font-bold text-lg">
                {isClient ? totalChannels.toLocaleString() : '...'}
              </p>
            </div>
            <div>
              <MemoryStick className="h-6 w-6 mx-auto text-accent" />
              <p className="mt-2 text-xs text-muted-foreground uppercase">Memoria</p>
              <p className="font-bold text-lg">{memoryUsage} MB</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
