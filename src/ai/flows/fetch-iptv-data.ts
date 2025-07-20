'use server';

/**
 * @fileOverview A Genkit flow that acts as a secure proxy for fetching data from IPTV servers.
 *
 * - fetchIptvData - A function that fetches data from a given URL.
 * - FetchIptvDataInput - The input type for the fetchIptvData function.
 * - FetchIptvDataOutput - The return type for the fetchIptvData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FetchIptvDataInputSchema = z.object({
  url: z.string().url().describe('The URL to fetch data from.'),
});
export type FetchIptvDataInput = z.infer<typeof FetchIptvDataInputSchema>;

// The output can be anything, so we use z.any()
const FetchIptvDataOutputSchema = z.any();
export type FetchIptvDataOutput = z.infer<typeof FetchIptvDataOutputSchema>;

export async function fetchIptvData(input: FetchIptvDataInput): Promise<FetchIptvDataOutput> {
  return fetchIptvDataFlow(input);
}

const fetchIptvDataFlow = ai.defineFlow(
  {
    name: 'fetchIptvDataFlow',
    inputSchema: FetchIptvDataInputSchema,
    outputSchema: FetchIptvDataOutputSchema,
  },
  async ({ url }) => {
    try {
      // Replicates the REQUEST_TIMEOUT logic from the provided HTML file.
      const response = await fetch(url, {
        signal: AbortSignal.timeout(20000), // 20-second timeout
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      // Handle cases where the response might be empty or not valid JSON
      if (!text) {
        // Some servers return empty responses for certain categories.
        // We will treat this as an empty array of streams/categories.
        return []; 
      }

      try {
        return JSON.parse(text);
      } catch (e) {
         // If parsing fails, it might not be a JSON response, which is an error for Xtream Codes API.
         console.error(`[Genkit Fetch Error] Failed to parse JSON from ${url}. Response text:`, text);
         throw new Error('Invalid JSON response from server.');
      }

    } catch (error: any) {
        if (error.name === 'TimeoutError') {
             console.error(`[Genkit Fetch Error] Request to ${url} timed out.`);
             throw new Error(`Request to IPTV server timed out after 20 seconds.`);
        }
        console.error(`[Genkit Fetch Error] Failed to fetch ${url}:`, error);
        // Re-throw the error to be handled by the calling action
        throw new Error(`Failed to fetch data from IPTV server: ${error.message}`);
    }
  }
);
