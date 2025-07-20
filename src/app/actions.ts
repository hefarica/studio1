'use server';

import { ai } from '@/genkit/config';
import { z } from 'genkit';
import type { OptimizeScanConfigurationOutput } from '@/ai/flows/optimize-scan-configuration';

const OptimizeScanConfigurationInputSchema = z.object({
  scanData: z
    .string()
    .describe('A JSON string representing historical scan data.'),
  currentConfiguration: z
    .string()
    .describe(
      'A JSON string representing the current scan configuration (e.g., parallel scans, timeouts).'
    ),
});

const OptimizeScanConfigurationOutputSchema = z.object({
  suggestedFrequency: z
    .string()
    .describe('Suggested frequency for scanning (e.g., "Daily", "Weekly").'),
  serverPrioritization: z
    .array(z.string())
    .describe('Which servers to prioritize in the next scan.'),
  resourceAllocation: z
    .string()
    .describe('How to allocate resources (e.g., "Increase parallel scans for stable servers").'),
  additionalNotes: z
    .string()
    .describe('Any other relevant optimization notes.'),
});

const optimizeScanConfigurationFlow = ai.defineFlow(
  {
    name: 'optimizeScanConfigurationFlow',
    inputSchema: OptimizeScanConfigurationInputSchema,
    outputSchema: OptimizeScanConfigurationOutputSchema,
  },
  async (input) => {
    const prompt = `You are an expert IPTV system administrator.
    Analyze the following scan data and current configuration to provide optimization suggestions.
    
    Scan Data: ${input.scanData}
    Current Configuration: ${input.currentConfiguration}

    Provide concrete suggestions for scan frequency, server prioritization, and resource allocation.
    Keep the additional notes concise and actionable.`;

    const { output } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: prompt,
      output: {
        schema: OptimizeScanConfigurationOutputSchema,
      },
    });

    return output!;
  }
);

export async function getAiOptimization(
  input: z.infer<typeof OptimizeScanConfigurationInputSchema>
): Promise<OptimizeScanConfigurationOutput> {
  return await optimizeScanConfigurationFlow(input);
}
