'use server';

/**
 * @fileOverview AI-powered scan configuration optimizer.
 *
 * - optimizeScanConfiguration - Analyzes scan data and suggests optimal scan settings.
 * - OptimizeScanConfigurationInput - The input type for the optimizeScanConfiguration function.
 * - OptimizeScanConfigurationOutput - The return type for the optimizeScanConfiguration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeScanConfigurationInputSchema = z.object({
  scanData: z
    .string()
    .describe('Historical scan data in JSON format, including server URLs, scan times, and active channel counts.'),
  currentConfiguration: z
    .string()
    .describe('The current scan configuration settings in JSON format.'),
});
export type OptimizeScanConfigurationInput = z.infer<typeof OptimizeScanConfigurationInputSchema>;

const OptimizeScanConfigurationOutputSchema = z.object({
  suggestedFrequency: z
    .string()
    .describe('Suggested scan frequency (e.g., daily, weekly, or custom cron expression).'),
  serverPrioritization: z
    .array(z.string())
    .describe('List of server URLs prioritized for scanning based on historical channel activity.'),
  resourceAllocation: z
    .string()
    .describe('Suggestions for resource allocation (e.g., memory or threads) based on scan data.'),
  additionalNotes: z
    .string()
    .describe('Any additional notes or recommendations for optimizing the scanning process.'),
});
export type OptimizeScanConfigurationOutput = z.infer<typeof OptimizeScanConfigurationOutputSchema>;

export async function optimizeScanConfiguration(input: OptimizeScanConfigurationInput): Promise<OptimizeScanConfigurationOutput> {
  return optimizeScanConfigurationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeScanConfigurationPrompt',
  input: {schema: OptimizeScanConfigurationInputSchema},
  output: {schema: OptimizeScanConfigurationOutputSchema},
  prompt: `You are an expert system administrator specializing in optimizing IPTV server scanning.

You will analyze past scan data and current configuration settings to suggest optimal configuration settings for future scans.

Consider the following information:

Historical Scan Data: {{{scanData}}}
Current Configuration: {{{currentConfiguration}}}

Based on this information, provide suggestions for:

- Suggested Scan Frequency: How often should the servers be scanned?
- Server Prioritization: Which servers should be scanned first based on historical activity?
- Resource Allocation: How should resources (memory, threads) be allocated for optimal performance?
- Additional Notes: Any other recommendations for improving the scanning process.
`,
});

const optimizeScanConfigurationFlow = ai.defineFlow(
  {
    name: 'optimizeScanConfigurationFlow',
    inputSchema: OptimizeScanConfigurationInputSchema,
    outputSchema: OptimizeScanConfigurationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
