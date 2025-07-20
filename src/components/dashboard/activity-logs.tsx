'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LogEntry } from '@/lib/types';
import { FileText, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const levelConfig = {
  info: { icon: Info, className: 'text-blue-500' },
  warning: { icon: AlertTriangle, className: 'text-yellow-500' },
  error: { icon: AlertCircle, className: 'text-red-500' },
};

export function ActivityLogs({ logs }: { logs: LogEntry[] }) {
  return (
    <Card className="shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Activity Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80 w-full pr-4">
          <div className="space-y-4">
            {logs.map(log => {
              const Icon = levelConfig[log.level].icon;
              const iconClass = levelConfig[log.level].className;
              return (
                <div key={log.id} className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${iconClass}`} />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{log.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
