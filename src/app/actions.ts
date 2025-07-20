'use server'

import { optimizeScanConfiguration, OptimizeScanConfigurationInput, OptimizeScanConfigurationOutput } from '@/ai/flows/optimize-scan-configuration';
import { fetchIptvData } from '@/ai/flows/fetch-iptv-data';

export async function getAiOptimization(input: OptimizeScanConfigurationInput): Promise<OptimizeScanConfigurationOutput> {
  try {
    const result = await optimizeScanConfiguration(input);
    return result;
  } catch (error) {
    console.error('Error getting AI optimization:', error);
    throw new Error('Failed to get AI optimization suggestions.');
  }
}

export async function fetchXtreamCodesData(serverUrl: string, username: string, password?: string) {
    const baseUrl = `${serverUrl}/player_api.php?username=${username}&password=${password ?? ''}`;

    try {
        const categories = await fetchIptvData({ url: `${baseUrl}&action=get_live_categories` });

        // The API might return an object on auth failure, so we must check for an array.
        if (!Array.isArray(categories)) {
            console.error('[Action Error] Categories response is not an array or auth failed:', categories);
            throw new Error('Authentication failed or invalid categories format from server.');
        }

        let allStreams: any[] = [];
        for (const category of categories) {
            // As per your logic, skip the 'all' category to avoid duplicates
            if (String(category.category_id) === 'all') continue; 
            
            try {
                const streams = await fetchIptvData({ url: `${baseUrl}&action=get_live_streams&category_id=${category.category_id}` });
                if (Array.isArray(streams)) {
                    allStreams = [...allStreams, ...streams];
                } else {
                     // This happens if a category is empty, which is normal.
                     console.warn(`[Action Warn] Could not fetch streams for category ${category.category_name}. The response was not an array.`);
                }
            } catch (e: any) {
                // Also normal, some categories might be protected or empty, we continue scanning others.
                console.warn(`[Action Warn] Skipping category "${category.category_name}" due to error:`, e.message);
            }
        }
        
        return allStreams;
    } catch (error: any) {
        // This is a critical failure, e.g., could not connect at all.
        console.error('[Action Error] Critical error fetching Xtream Codes data:', error.message);
        throw new Error(`Failed to connect to the IPTV server. Please check the URL and credentials. Details: ${error.message}`);
    }
}