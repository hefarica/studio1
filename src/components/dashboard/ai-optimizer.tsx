'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader, Sparkles, User } from 'lucide-react';
import { getAiOptimization } from '@/app/actions';
import type { OptimizeScanConfigurationOutput } from '@/ai/flows/optimize-scan-configuration';

type Message = {
  role: 'user' | 'assistant';
  content: string | OptimizeScanConfigurationOutput;
};

export function AiOptimizer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleOptimize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');

    try {
      const result = await getAiOptimization({
        scanData: JSON.stringify({
          history: [{ server: 'EVESTV IP TV', channels: 39860, time: 240 }],
          userQuery: input,
        }),
        currentConfiguration: JSON.stringify({ parallel: 3, chunkSize: 2500 }),
      });
      
      const assistantMessage: Message = { role: 'assistant', content: result };
      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      const errorMessage: Message = { role: 'assistant', content: 'Lo siento, no pude procesar tu solicitud. Inténtalo de nuevo.' };
      setMessages((prev) => [...prev, errorMessage]);
      console.error('Optimization failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-card shadow-lg rounded-lg text-card-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          Optimizar con IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-4 max-h-96 overflow-y-auto pr-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                {message.role === 'assistant' && <div className="p-2 rounded-full bg-primary/20"><Sparkles className="h-5 w-5 text-primary" /></div>}
                <div className={`p-3 rounded-lg max-w-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {typeof message.content === 'string' ? (
                    <p className="text-sm">{message.content}</p>
                  ) : (
                    <div className="text-sm space-y-2">
                        <p><strong className='text-primary'>Frecuencia Sugerida:</strong> {message.content.suggestedFrequency}</p>
                        <p><strong className='text-primary'>Priorización de Servidores:</strong> {message.content.serverPrioritization.join(', ')}</p>
                        <p><strong className='text-primary'>Asignación de Recursos:</strong> {message.content.resourceAllocation}</p>
                        <p><strong className='text-primary'>Notas Adicionales:</strong> {message.content.additionalNotes}</p>
                    </div>
                  )}
                </div>
                {message.role === 'user' && <div className="p-2 rounded-full bg-muted"><User className="h-5 w-5 text-foreground" /></div>}
              </div>
            ))}
             {isLoading && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/20"><Sparkles className="h-5 w-5 text-primary" /></div>
                <div className="p-3 rounded-lg bg-muted flex items-center">
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Pensando...
                </div>
              </div>
            )}
          </div>
          <form onSubmit={handleOptimize} className="flex items-center gap-2 pt-4 border-t border-border">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="¿Cómo puedo optimizar el escaneo de servidores con muchos errores?"
              className="flex-1 bg-input text-base"
              rows={1}
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader className="animate-spin" /> : 'Enviar'}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
