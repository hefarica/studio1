'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BrainCircuit, Clock, MemoryStick, Tv } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getAiOptimization } from '@/app/actions';
import { Button } from '../ui/button';
import { Loader } from 'lucide-react';
import type { AiOptimizationSuggestion } from '@/lib/types';

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
  const [optimizing, setOptimizing] = useState(false);
  const [optimization, setOptimization] = useState<AiOptimizationSuggestion | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleOptimize = async () => {
    setOptimizing(true);
    setOptimization(null);
    try {
      const result = await getAiOptimization({
        scanData: JSON.stringify({
          history: [{ server: 'EVESTV IP TV', channels: 39860, time: 240 }],
        }),
        currentConfiguration: JSON.stringify({ parallel: 3, chunkSize: 2500 }),
      });
      setOptimization(result);
    } catch (error) {
      console.error('Optimization failed', error);
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <Card className="shadow-lg rounded-lg bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BrainCircuit className="h-5 w-5" />
          AI Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Scan Progress</span>
              <span className="text-sm font-bold text-accent">{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            <div className="text-xs text-muted-foreground mt-1 text-right">
              ETA: {eta}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <Tv className="h-6 w-6 mx-auto text-accent" />
              <p className="mt-2 text-sm text-muted-foreground">Active Channels</p>
              <p className="font-bold text-lg">
                {isClient ? totalChannels.toLocaleString() : '...'}
              </p>
            </div>
            <div>
              <MemoryStick className="h-6 w-6 mx-auto text-accent" />
              <p className="mt-2 text-sm text-muted-foreground">Memory</p>
              <p className="font-bold text-lg">{memoryUsage} MB</p>
            </div>
            <div>
              <Clock className="h-6 w-6 mx-auto text-accent" />
              <p className="mt-2 text-sm text-muted-foreground">ETA</p>
              <p className="font-bold text-lg">{eta}</p>
            </div>
          </div>
          
          <Button onClick={handleOptimize} disabled={optimizing} className="w-full bg-primary hover:bg-primary/90">
            {optimizing ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Optimizing...
              </>
            ) : (
              'Optimize Scan with AI'
            )}
          </Button>

          {optimization && (
            <div className="text-xs space-y-2 mt-4 bg-background/50 p-3 rounded-md">
              <p><strong className='text-accent'>Frequency:</strong> {optimization.suggestedFrequency}</p>
              <p><strong className='text-accent'>Prioritization:</strong> {optimization.serverPrioritization.join(', ')}</p>
              <p><strong className='text-accent'>Resources:</strong> {optimization.resourceAllocation}</p>
              <p><strong className='text-accent'>Notes:</strong> {optimization.additionalNotes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
