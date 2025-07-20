'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BrainCircuit, Clock, MemoryStick, Tv } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getAiOptimization } from '@/app/actions';
import { Button } from '../ui/button';
import { Loader } from 'lucide-react';
import type { OptimizeScanConfigurationOutput } from '@/ai/flows/optimize-scan-configuration';

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
  const [optimization, setOptimization] = useState<OptimizeScanConfigurationOutput | null>(null);

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
    <Card className="bg-card-bg shadow-lg rounded-lg text-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BrainCircuit className="h-5 w-5" />
          AI Optimizer & Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Scan Progress</span>
              <span className="text-sm font-bold text-success-color">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full h-2 bg-gray-600" />
            <div className="text-xs text-gray-400 mt-1 text-right">
              ETA: {eta}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <Tv className="h-6 w-6 mx-auto text-success-color" />
              <p className="mt-2 text-xs text-gray-400">CANALES ACTIVOS</p>
              <p className="font-bold text-lg">
                {isClient ? totalChannels.toLocaleString() : '...'}
              </p>
            </div>
            <div>
              <MemoryStick className="h-6 w-6 mx-auto text-success-color" />
              <p className="mt-2 text-xs text-gray-400">MEMORIA</p>
              <p className="font-bold text-lg">{memoryUsage} MB</p>
            </div>
          </div>
          
          <Button onClick={handleOptimize} disabled={optimizing} className="w-full bg-primary-color hover:bg-primary-color/90 text-white">
            {optimizing ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Optimizando...
              </>
            ) : (
              'Optimizar con IA'
            )}
          </Button>

          {optimization && (
            <div className="text-xs space-y-2 mt-4 bg-dark-bg/50 p-3 rounded-md border border-gray-700">
              <p><strong className='text-success-color'>Frecuencia Sugerida:</strong> {optimization.suggestedFrequency}</p>
              <p><strong className='text-success-color'>Priorización de Servidores:</strong> {optimization.serverPrioritization.join(', ')}</p>
              <p><strong className='text-success-color'>Asignación de Recursos:</strong> {optimization.resourceAllocation}</p>
              <p><strong className='text-success-color'>Notas Adicionales:</strong> {optimization.additionalNotes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
