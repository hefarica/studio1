'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ScanProgress } from '@/lib/types';
import { Zap, Clock, Tv, MemoryStick } from 'lucide-react';
import { useMemo } from 'react';

const ChartTooltipContent = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Usage
            </span>
            <span className="font-bold text-muted-foreground">
              {payload[0].value} MB
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export function ProgressOverview({
  progress,
  eta,
  memoryUsage,
  totalChannels,
}: ScanProgress) {
  
  const chartData = useMemo(() => [
    { name: 'Memory', usage: memoryUsage.toFixed(2) }
  ], [memoryUsage]);

  return (
    <Card className="shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          Real-time Scan Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-semibold text-primary">{progress}%</span>
              <span className="text-sm text-muted-foreground">Complete</span>
            </div>
            <Progress value={progress} aria-label={`${progress}% scan complete`} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-secondary/50 p-4 rounded-lg">
              <Clock className="h-6 w-6 mx-auto text-accent" />
              <p className="mt-2 text-sm text-muted-foreground">ETA</p>
              <p className="font-bold text-lg">{eta}</p>
            </div>
            <div className="bg-secondary/50 p-4 rounded-lg">
              <Tv className="h-6 w-6 mx-auto text-accent" />
              <p className="mt-2 text-sm text-muted-foreground">Active Channels</p>
              <p className="font-bold text-lg">{totalChannels.toLocaleString()}</p>
            </div>
            <div className="bg-secondary/50 p-4 rounded-lg col-span-2">
              <MemoryStick className="h-6 w-6 mx-auto text-accent" />
              <p className="mt-2 text-sm text-muted-foreground">Memory Usage</p>
              <div className="h-16 w-full mt-1" data-ai-hint="memory usage chart">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                    <XAxis type="number" hide domain={[0, 512]}/>
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip cursor={{fill: 'transparent'}} content={<ChartTooltipContent />} />
                    <Bar dataKey="usage" fill="var(--color-chart-2)" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
