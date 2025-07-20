'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Server as ServerIcon, Trash2, Loader, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { Server, ServerStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const statusConfig: Record<
  ServerStatus,
  {
    label: string;
    icon: React.ElementType;
    badgeClass: string;
    iconClass: string;
  }
> = {
  Online: { label: 'Online', icon: CheckCircle2, badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-700', iconClass: 'text-green-500' },
  Scanning: { label: 'Scanning', icon: Loader, badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-700', iconClass: 'text-blue-500 animate-spin' },
  Offline: { label: 'Offline', icon: XCircle, badgeClass: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600', iconClass: 'text-gray-500' },
  Error: { label: 'Error', icon: AlertTriangle, badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-700', iconClass: 'text-red-500' },
};

type ServerListProps = {
  servers: Server[];
  onDeleteServer: (id: string) => void;
};

export function ServerList({ servers, onDeleteServer }: ServerListProps) {
  return (
    <Card className="shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ServerIcon className="h-6 w-6 text-primary" />
          Configured Servers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Active Channels</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map(server => {
                const config = statusConfig[server.status];
                return (
                  <TableRow key={server.id}>
                    <TableCell className="font-medium">{server.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{server.url}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("gap-1.5", config.badgeClass)}>
                         <config.icon className={cn("h-3.5 w-3.5", config.iconClass)} />
                         {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{server.activeChannels?.toLocaleString() ?? 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
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
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
