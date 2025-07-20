'use client';

import { useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getAiOptimization } from '@/app/actions';
import type { AiOptimizationSuggestion, Server } from '@/lib/types';
import { Bot, Wand2, Lightbulb, Server as ServerIcon, Clock, Cpu } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

type AiOptimizerProps = {
  servers: Server[];
}

export function AiOptimizer({ servers }: AiOptimizerProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [suggestion, setSuggestion] = useState<AiOptimizationSuggestion | null>(null);

  const handleOptimize = () => {
    startTransition(async () => {
      try {
        const scanData = JSON.stringify(
            servers.map(s => ({ url: s.url, status: s.status, activeChannels: s.activeChannels}))
        );
        const currentConfiguration = JSON.stringify({
            scanFrequency: "daily",
            concurrentScans: 4,
            resourceLimit: "medium"
        });

        const result = await getAiOptimization({ scanData, currentConfiguration });
        setSuggestion(result);
        toast({
          title: 'Optimization Complete!',
          description: 'AI has generated new configuration suggestions.',
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Optimization Failed',
          description: 'Could not get suggestions from the AI. Please try again later.',
        });
      }
    });
  };

  const renderSuggestions = () => {
    if (!suggestion) return null;
    return (
      <div className="space-y-4 text-sm mt-4">
        <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
          <Clock className="h-5 w-5 text-accent mt-1 shrink-0" />
          <div>
            <h4 className="font-semibold">Suggested Frequency</h4>
            <p className="text-muted-foreground">{suggestion.suggestedFrequency}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
          <ServerIcon className="h-5 w-5 text-accent mt-1 shrink-0" />
          <div>
            <h4 className="font-semibold">Server Prioritization</h4>
            <ul className="list-disc list-inside text-muted-foreground">
                {suggestion.serverPrioritization.map((s,i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
          <Cpu className="h-5 w-5 text-accent mt-1 shrink-0" />
          <div>
            <h4 className="font-semibold">Resource Allocation</h4>
            <p className="text-muted-foreground">{suggestion.resourceAllocation}</p>
          </div>
        </div>
         <div className="flex items-start gap-3 p-3 bg-accent/10 border border-accent/20 rounded-lg">
          <Lightbulb className="h-5 w-5 text-accent mt-1 shrink-0" />
          <div>
            <h4 className="font-semibold">Additional Notes</h4>
            <p className="text-muted-foreground">{suggestion.additionalNotes}</p>
          </div>
        </div>
      </div>
    );
  }
  
  const renderLoadingState = () => (
     <div className="space-y-4 text-sm mt-4">
        <div className="flex items-start gap-3 p-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <div className="w-full space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="flex items-start gap-3 p-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <div className="w-full space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
     </div>
  );

  return (
    <Card className="shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          AI-Powered Optimization
        </CardTitle>
        <CardDescription>
          Let our AI analyze scan data to proactively optimize future scans.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? renderLoadingState() : suggestion ? renderSuggestions() : (
           <div className="text-center text-muted-foreground p-4 bg-secondary/30 rounded-lg">
            Click the button to get AI-powered optimization suggestions.
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleOptimize} disabled={isPending} className="w-full">
          {isPending ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              {suggestion ? 'Re-Optimize' : 'Optimize Now'}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
