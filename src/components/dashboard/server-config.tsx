'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { Server } from '@/lib/types';
import { Plus, TestTubeDiagonal } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Se requiere nombre'),
  url: z.string().url('URL inválida'),
  user: z.string().min(1, 'Se requiere usuario'),
  password: z.string().optional(),
});

type ServerConfigProps = {
  onAddServer: (server: Omit<Server, 'id' | 'status' | 'activeChannels' | 'lastScan'>) => void;
};

export function ServerConfig({ onAddServer }: ServerConfigProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: 'EVESTV IP TV',
      url: 'http://126954339934.d4ktv.info:80',
      user: 'uqb3fbu3b',
      password: '••••••••',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddServer(values);
  }

  // Placeholder function for testing connections
  const handleTestConnections = () => {
    alert('Funcionalidad de prueba de conexión pendiente de implementación.');
    // In a real scenario, this would trigger a check for each server.
  };

  return (
    <Card className="bg-card shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-cog"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M15 2v5h5"/><path d="M12 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/><path d="M12 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/><path d="M7 15a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/></svg>
          Configuración de Servidor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Nombre del Servidor" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="URL del Servidor" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="user"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Usuario" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type="password" placeholder="Contraseña" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-4 pt-2">
                <Button type="submit" variant="default" className="bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4"/>
                    Agregar Servidor
                </Button>
                <Button type="button" variant="secondary" onClick={handleTestConnections}>
                    <TestTubeDiagonal className="mr-2 h-4 w-4"/>
                    Probar Conexiones
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
