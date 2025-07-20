'use server';

/**
 * @fileOverview A Genkit flow that acts as a secure proxy for fetching data from IPTV servers,
 * with built-in retry logic for connection stability.
 *
 * - fetchIptvData - A function that fetches data from a given URL with retries.
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
    const maxRetries = 3;
    const initialDelay = 2000; // 2 seconds

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const timeout = 15000 + (attempt * 10000); // Progressive timeout: 25s, 35s, 45s
        
        console.log(`[Genkit Fetch] Attempt ${attempt}/${maxRetries}: Fetching ${url} with ${timeout}ms timeout.`);
        
        const response = await fetch(url, {
          signal: AbortSignal.timeout(timeout),
          headers: {
            'User-Agent': 'IPTV-Genius-Scanner/1.0',
            'Accept': 'application/json, */*', // Accept JSON and fallbacks
          }
        });
        
        if (response.status === 512) {
          throw new Error(`Request failed with status 512`);
        }
        
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        
        if (!text) {
          console.warn(`[Genkit Fetch Warn] Empty response from ${url}. Treating as empty array.`);
          return []; 
        }

        try {
          return JSON.parse(text);
        } catch (e) {
           console.error(`[Genkit Fetch Error] Failed to parse JSON from ${url}. Response text:`, text.substring(0, 500));
           throw new Error('Invalid JSON response from server.');
        }

      } catch (error: any) {
        lastError = error;
        console.error(`[Genkit Fetch Error] Attempt ${attempt} failed for ${url}:`, error.message);
        
        if (attempt < maxRetries) {
          const delay = initialDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`[Genkit Fetch] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If all retries fail, throw the last captured error.
    throw new Error(`Failed to fetch data from IPTV server after ${maxRetries} attempts: ${lastError?.message}`);
  }
);
