'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LogEntry } from '@/lib/types';
import { FileText, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ActivityLogs({ logs, onClearLog }: { logs: LogEntry[], onClearLog: () => void }) {
  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return 'text-blue-400';
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <Card className="bg-card shadow-lg rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          Log de Actividades
        </CardTitle>
        <Button variant="destructive" size="sm" onClick={onClearLog}>
          <Trash2 className="mr-2 h-4 w-4" />
          Limpiar Log
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48 w-full rounded-md border border-border bg-black p-4 font-mono text-xs">
          <div className="space-y-1">
            {logs.map(log => (
              <p key={log.id} className={cn('whitespace-pre-wrap', getLevelColor(log.level))}>
                {log.message}
              </p>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
