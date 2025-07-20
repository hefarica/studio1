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
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import type { Server } from '@/lib/types';
import { Plus, TestTubeDiagonal } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Invalid URL'),
  user: z.string().min(1, 'User is required'),
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
      password: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddServer(values);
    form.reset({ name: '', url: '', user: '', password: '' });
  }

  const handleTestConnections = () => {
    // Placeholder - this would likely trigger a test for all configured servers
    alert('Connection testing functionality is pending implementation.');
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Server Configuration</CardTitle>
        <CardDescription>Add a new IPTV server to start scanning.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Server Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., My Awesome TV" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Server URL</FormLabel>
                      <FormControl>
                        <Input placeholder="http://server.url:port" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="user"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Your username" {...field} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="(Optional)" {...field} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
          </CardContent>
          <CardFooter className="flex justify-start gap-4">
              <Button type="submit">
                  <Plus className="mr-2 h-4 w-4"/>
                  Add Server
              </Button>
              <Button type="button" variant="outline" onClick={handleTestConnections}>
                  <TestTubeDiagonal className="mr-2 h-4 w-4"/>
                  Test Connections
              </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
