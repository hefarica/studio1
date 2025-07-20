'use server'

import { optimizeScanConfiguration, OptimizeScanConfigurationInput, OptimizeScanConfigurationOutput } from '@/ai/flows/optimize-scan-configuration';

export async function getAiOptimization(input: OptimizeScanConfigurationInput): Promise<OptimizeScanConfigurationOutput> {
  try {
    const result = await optimizeScanConfiguration(input);
    return result;
  } catch (error) {
    console.error('Error getting AI optimization:', error);
    throw new Error('Failed to get AI optimization suggestions.');
  }
}

async function fetchWithTimeout(resource: string, options: RequestInit & { timeout: number }) {
  const { timeout, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...rest,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}


export async function fetchXtreamCodesData(serverUrl: string, username: string, password?: string) {
    const baseUrl = `${serverUrl}/player_api.php?username=${username}&password=${password ?? ''}`;

    try {
        const categoriesResponse = await fetchWithTimeout(`${baseUrl}&action=get_live_categories`, { timeout: 15000 });
        if (!categoriesResponse.ok) {
            // Handle non-JSON error responses gracefully
            const errorText = await categoriesResponse.text();
            console.error(`Failed to fetch categories, status: ${categoriesResponse.status}, response: ${errorText}`);
            throw new Error(`Failed to fetch categories. Server responded with status ${categoriesResponse.status}.`);
        }
        const categories = await categoriesResponse.json();

        if (!Array.isArray(categories)) {
            // This can happen if the API returns an auth error object instead of an array
            console.error('Categories response is not an array.', categories);
            throw new Error('Failed to authenticate or invalid categories format.');
        }

        let allStreams: any[] = [];
        for (const category of categories) {
            // Skip the "All" category to avoid duplicates and unnecessary processing, as seen in the provided logic.
            if (category.category_id === 'all') continue; 
            
            try {
                const streamsResponse = await fetchWithTimeout(`${baseUrl}&action=get_live_streams&category_id=${category.category_id}`, { timeout: 20000 });
                if (streamsResponse.ok) {
                    const streams = await streamsResponse.json();
                    if (Array.isArray(streams)) {
                        allStreams = [...allStreams, ...streams];
                    }
                } else {
                     console.warn(`Could not fetch streams for category ${category.category_name}. Status: ${streamsResponse.status}`);
                }
            } catch (e: any) {
                // Log error for a specific category but continue with others
                console.warn(`Skipping category "${category.category_name}" due to error:`, e.message);
            }
        }
        
        return allStreams;
    } catch (error: any) {
        console.error('Error fetching Xtream Codes data:', error.message);
        // Provide a more user-friendly error
        throw new Error('Failed to fetch data from the server. Please check the URL and credentials.');
    }
}
