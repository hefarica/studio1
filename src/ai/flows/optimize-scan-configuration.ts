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
    .describe('Historical scan data in JSON format, including server URLs, scan times, and active channel counts. Also includes the user query.'),
  currentConfiguration: z
    .string()
    .describe('The current scan configuration in JSON format.'),
});
export type OptimizeScanConfigurationInput = z.infer<typeof OptimizeScanConfigurationInputSchema>;

const OptimizeScanConfigurationOutputSchema = z.object({
  suggestedFrequency: z
    .string()
    .describe('Suggested scan frequency (e.g., "Daily", "Weekly", or a custom cron expression).'),
  serverPrioritization: z
    .array(z.string())
    .describe('List of server URLs to prioritize for scanning, based on historical activity and user query.'),
  resourceAllocation: z
    .string()
    .describe('Suggestions for resource allocation (e.g., memory or threads) based on scan data.'),
  additionalNotes: z
    .string()
    .describe('Any additional notes or recommendations to optimize the scanning process. Directly responds to the user query if provided.'),
});
export type OptimizeScanConfigurationOutput = z.infer<typeof OptimizeScanConfigurationOutputSchema>;

export async function optimizeScanConfiguration(input: OptimizeScanConfigurationInput): Promise<OptimizeScanConfigurationOutput> {
  return optimizeScanConfigurationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeScanConfigurationPrompt',
  input: {schema: OptimizeScanConfigurationInputSchema},
  output: {schema: OptimizeScanConfigurationOutputSchema},
  prompt: `You are an expert systems administrator specializing in optimizing IPTV server scanning. Your language is English.

You will analyze past scan data and the current configuration to suggest optimal settings for future scans. You will also respond to the user's specific query.

Consider the following information:

Historical Data and User Query: {{{scanData}}}
Current Configuration: {{{currentConfiguration}}}

Based on this information, provide suggestions in English for:

- Suggested Frequency: How often should the servers be scanned?
- Server Prioritization: Which servers should be scanned first based on historical activity?
- Resource Allocation: How should resources (memory, threads) be allocated for optimal performance?
- Additional Notes: Any other recommendations to improve the process, directly addressing the user's query if provided.
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
