'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Server as ServerIcon, Trash2, Search, Loader, Circle, CheckCircle, AlertTriangle } from 'lucide-react';
import type { Server, ServerStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

type ServerListProps = {
  servers: Server[];
  onScanServer: (id: string) => void;
  onDeleteServer: (id: string) => void;
  isScanning: boolean;
};

const statusConfig: Record<ServerStatus, { icon: React.ElementType, color: string, label: string }> = {
    Online: { icon: CheckCircle, color: 'text-green-500', label: 'Online' },
    Offline: { icon: AlertTriangle, color: 'text-gray-500', label: 'Offline' },
    Scanning: { icon: Loader, color: 'text-blue-500 animate-spin', label: 'Scanning' },
    Error: { icon: AlertTriangle, color: 'text-red-500', label: 'Error' }
}

export function ServerList({ servers, onScanServer, onDeleteServer, isScanning }: ServerListProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Configured Servers</CardTitle>
        <CardDescription>Manage and monitor your IPTV servers.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {servers.map(server => {
             const StatusIcon = statusConfig[server.status].icon;
             const statusColor = statusConfig[server.status].color;

             return (
              <div key={server.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                     <StatusIcon className={cn("h-4 w-4", statusColor)} />
                     <h3 className="font-semibold text-primary">{server.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{server.url}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">{server.activeChannels?.toLocaleString('en-US')}</span> channels | Last scan: {server.lastScan}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                         <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onScanServer(server.id)}
                          disabled={isScanning}
                          aria-label={`Scan ${server.name}`}
                        >
                          {isScanning && server.status === 'Scanning' ? <Loader className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Scan Server</TooltipContent>
                    </Tooltip>
                     <AlertDialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" disabled={isScanning} aria-label={`Delete ${server.name}`}>
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </AlertDialogTrigger>
                           </TooltipTrigger>
                           <TooltipContent>Delete Server</TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the server configuration for "{server.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeleteServer(server.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                  </TooltipProvider>
                </div>
              </div>
             )
          })}
          {servers.length === 0 && (
            <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
                <ServerIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium">No servers configured</h3>
                <p className="mt-1 text-sm text-gray-500">Add a server above to get started.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
