'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { Server as ServerIcon, Trash2, Search, Loader } from 'lucide-react';
import type { Server } from '@/lib/types';

type ServerListProps = {
  servers: Server[];
  onScanServer: (id: string) => void;
  onDeleteServer: (id: string) => void;
  isScanning: boolean;
};

export function ServerList({ servers, onScanServer, onDeleteServer, isScanning }: ServerListProps) {
  return (
    <Card className="bg-card shadow-lg rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ServerIcon className="h-5 w-5" />
          Servidores Configurados
        </CardTitle>
        {servers.length > 0 && (
          <Badge variant="default">{servers.length} servidor(es)</Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {servers.map(server => (
            <div key={server.id} className="flex items-center justify-between p-4 bg-background/50 rounded-md">
              <div className="flex-1">
                <h3 className="font-bold text-accent">{server.name}</h3>
                <p className="text-sm text-muted-foreground">{server.url}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Usuario: {server.user} | {server.activeChannels?.toLocaleString('es-ES')} canales | Último escaneo: {server.lastScan}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-primary hover:bg-primary/10 hover:text-primary/80"
                  onClick={() => onScanServer(server.id)}
                  disabled={isScanning}
                >
                  {isScanning && server.status === 'Scanning' ? <Loader className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                </Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive/80" disabled={isScanning}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Esto eliminará permanentemente la configuración del servidor para "{server.name}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteServer(server.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
              </div>
            </div>
          ))}
          {servers.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No hay servidores configurados.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
