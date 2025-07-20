'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LogEntry } from '@/lib/types';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

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
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Activity Logs</CardTitle>
          <CardDescription>Live feed of system and scanning events.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onClearLog}>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Log
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 w-full rounded-md border bg-muted/20 p-4">
          <div className="space-y-2 font-mono text-xs">
            {logs.map(log => (
              <p key={log.id}>
                <span className="text-muted-foreground mr-2">[{log.timestamp}]</span>
                <span className={cn(getLevelColor(log.level))}>
                  {log.message}
                </span>
              </p>
            ))}
             {logs.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Logs will appear here...</p>
             )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
