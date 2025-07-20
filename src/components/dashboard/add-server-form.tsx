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
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Server } from '@/lib/types';
import { Server as ServerIcon, KeyRound } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Server name must be at least 2 characters.',
  }),
  url: z.string().url({ message: 'Please enter a valid URL.' }),
  credentials: z.string().optional(),
});

type AddServerFormProps = {
  onServerAdded: (server: Omit<Server, 'id' | 'status' | 'activeChannels'>) => void;
};

export function AddServerForm({ onServerAdded }: AddServerFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      url: '',
      credentials: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onServerAdded(values);
    form.reset();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add New IPTV Server</DialogTitle>
        <DialogDescription>
          Enter the details of your server to start scanning.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
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
                 <div className="relative">
                   <ServerIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <FormControl>
                    <Input className="pl-10" placeholder="http://example.com:8080" {...field} />
                  </FormControl>
                 </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="credentials"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Credentials (optional)</FormLabel>
                 <div className="relative">
                   <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input className="pl-10" placeholder="username:password" {...field} />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full">Add Server</Button>
        </form>
      </Form>
    </>
  );
}
