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

export function ActivityLogs({ logs, onClearLog }: { logs: LogEntry[], onClearLog: () => void }) {
  return (
    <Card className="bg-card shadow-lg rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Log de Actividades
        </CardTitle>
        <Button variant="secondary" size="sm" onClick={onClearLog}>
          <Trash2 className="mr-2 h-4 w-4" />
          Limpiar Log
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48 w-full rounded-md border border-border bg-black p-4 font-mono text-xs text-green-400">
          <div className="space-y-1">
            {logs.map(log => (
              <p key={log.id}>{log.message}</p>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
