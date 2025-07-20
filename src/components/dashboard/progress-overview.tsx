'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BrainCircuit className="h-5 w-5 text-primary" />
          Scan Progress
        </CardTitle>
        <CardDescription>Real-time updates on the scanning process.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">Overall Progress</span>
            <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full h-2" />
          <div className="text-xs text-muted-foreground mt-1 text-right">
            ETA: {eta}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-4 bg-secondary/30 rounded-lg">
            <Tv className="h-6 w-6 mx-auto text-primary" />
            <p className="mt-2 text-xs text-muted-foreground uppercase">Channels Found</p>
            <p className="font-bold text-xl">
              {isClient ? totalChannels.toLocaleString() : '...'}
            </p>
          </div>
          <div className="p-4 bg-secondary/30 rounded-lg">
            <MemoryStick className="h-6 w-6 mx-auto text-primary" />
            <p className="mt-2 text-xs text-muted-foreground uppercase">Memory</p>
            <p className="font-bold text-xl">{memoryUsage} MB</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
