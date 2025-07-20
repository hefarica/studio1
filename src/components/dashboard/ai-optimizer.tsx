'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
      // Note: scanData and currentConfiguration are hardcoded for this example.
      // In a real application, you would pass dynamic, relevant data.
      const result = await getAiOptimization({
        scanData: JSON.stringify({
          history: [{ server: 'EVESTV IP TV', channels: 39860, time: 240, errors: 5 }],
          userQuery: input,
        }),
        currentConfiguration: JSON.stringify({ parallelScans: 3, timeoutSeconds: 20 }),
      });
      
      const assistantMessage: Message = { role: 'assistant', content: result };
      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      const errorMessage: Message = { role: 'assistant', content: "Sorry, I couldn't process your request. Please try again." };
      setMessages((prev) => [...prev, errorMessage]);
      console.error('Optimization failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          AI-Powered Optimization
        </CardTitle>
        <CardDescription>Ask for suggestions to improve your scanning strategy.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 h-[30rem] flex flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto pr-4">
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-muted-foreground py-10">
                <p>Ask a question to get started, e.g.,</p>
                <p className="font-medium">"How can I scan servers with many errors more efficiently?"</p>
              </div>
            )}
            {messages.map((message, index) => (
              <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                {message.role === 'assistant' && <div className="p-2 rounded-full bg-primary/10 flex-shrink-0"><Sparkles className="h-5 w-5 text-primary" /></div>}
                <div className={`p-3 rounded-lg max-w-md ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {typeof message.content === 'string' ? (
                    <p className="text-sm">{message.content}</p>
                  ) : (
                    <div className="text-sm space-y-2">
                        <p><strong className='font-semibold text-primary'>Suggested Frequency:</strong> {message.content.suggestedFrequency}</p>
                        <p><strong className='font-semibold text-primary'>Server Prioritization:</strong> {message.content.serverPrioritization.join(', ')}</p>
                        <p><strong className='font-semibold text-primary'>Resource Allocation:</strong> {message.content.resourceAllocation}</p>
                        <p><strong className='font-semibold text-primary'>Additional Notes:</strong> {message.content.additionalNotes}</p>
                    </div>
                  )}
                </div>
                {message.role === 'user' && <div className="p-2 rounded-full bg-muted flex-shrink-0"><User className="h-5 w-5 text-foreground" /></div>}
              </div>
            ))}
             {isLoading && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/10 flex-shrink-0"><Sparkles className="h-5 w-5 text-primary" /></div>
                <div className="p-3 rounded-lg bg-muted flex items-center">
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Thinking...
                </div>
              </div>
            )}
          </div>
          <form onSubmit={handleOptimize} className="flex items-center gap-2 pt-4 border-t">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for optimization tips..."
              className="flex-1"
              rows={1}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleOptimize(e);
                }
              }}
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader className="animate-spin" /> : 'Send'}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
