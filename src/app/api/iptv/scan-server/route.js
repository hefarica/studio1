import { NextResponse } from 'next/server';
import pLimit from 'p-limit';
import { z } from 'zod';
import { CONFIG } from '@/lib/constants';

export const runtime = 'nodejs'; // Force Node.js runtime for compatibility

// Zod schemas for robust validation
const CategorySchema = z.object({
  category_id: z.string(),
  category_name: z.string(),
});
const ChannelSchema = z.object({
  stream_id: z.coerce.string(),
  name: z.string(),
  stream_icon: z.string().optional(),
  category_id: z.coerce.string(),
});
const ServerInfoSchema = z.object({
  server_info: z.any(),
  user_info: z.any().optional(),
});

/**
 * Fetches JSON data through the app's internal proxy.
 * @param {string} url - The URL to fetch.
 * @param {number} timeout - Request timeout in milliseconds.
 * @returns {Promise<any>} - The JSON response from the server.
 */
async function safeFetchJSON(url, timeout = CONFIG.REQUEST_TIMEOUT) {
    const proxyUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/iptv/proxy` : '/api/iptv/proxy';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Proxy error: ${response.status}`);
        }
        
        const result = await response.json();

        if (!result.success) {
             throw new Error(result.error || 'Proxy request failed');
        }

        return result.data;
    } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error) {
            throw new Error(`[safeFetch] Failed for ${url}: ${err.message}`);
        }
        throw new Error(`[safeFetch] An unknown error occurred for ${url}`);
    }
}

export async function POST(request) {
  try {
    const { server } = await request.json();
    if (!server || !server.url || !server.username || !server.password) {
      return NextResponse.json({ error: 'Datos del servidor incompletos' }, { status: 400 });
    }

    // Step 1: Get Server Info to validate connection
    const serverInfoUrl = `${server.url}/player_api.php?username=${server.username}&password=${server.password}&action=get_server_info`;
    const serverInfoRaw = await safeFetchJSON(serverInfoUrl);
    const serverInfoParsed = ServerInfoSchema.safeParse(serverInfoRaw);
    if (!serverInfoParsed.success) {
      throw new Error(`Respuesta de información del servidor inválida: ${serverInfoParsed.error.message}`);
    }

    // Step 2: Get Categories
    const categoriesUrl = `${server.url}/player_api.php?username=${server.username}&password=${server.password}&action=get_live_categories`;
    const categoriesRaw = await safeFetchJSON(categoriesUrl);
    const categoriesParsed = z.array(CategorySchema).safeParse(categoriesRaw);
    if (!categoriesParsed.success) {
      throw new Error(`Respuesta de categorías inválida: ${categoriesParsed.error.message}`);
    }
    const categories = categoriesParsed.data;

    // Step 3: Scan all categories in parallel with a concurrency limit
    const limit = pLimit(CONFIG.MAX_PARALLEL);
    const channelCounts = await Promise.all(
      categories.map(category =>
        limit(async () => {
          try {
            const channelsUrl = `${server.url}/player_api.php?username=${server.username}&password=${server.password}&action=get_live_streams&category_id=${category.category_id}`;
            const channelsRaw = await safeFetchJSON(channelsUrl, 20000); // Longer timeout for channels
            const channelsParsed = z.array(ChannelSchema).safeParse(channelsRaw);
            if (channelsParsed.success) {
              return channelsParsed.data.length;
            }
            console.warn(`[SCAN] Categoría ${category.category_name} con formato inválido: ${channelsParsed.error.message}`);
            return 0; // Return 0 for invalid categories but don't fail the whole scan
          } catch (error) {
            if (error instanceof Error) {
                console.warn(`[SCAN] Error obteniendo canales de categoría ${category.category_name}: ${error.message}`);
            }
            return 0; // Don't fail the whole scan for one bad category
          }
        })
      )
    );

    const totalChannels = channelCounts.reduce((acc, count) => acc + count, 0);

    const results = {
      serverInfo: serverInfoParsed.data.server_info,
      categories,
      totalChannels,
      protocol: 'Xtream Codes', // Detected from successful server_info call
      error: null
    };

    return NextResponse.json({ success: true, results });

  } catch (error) {
    if (error instanceof Error) {
        console.error(`[API/scan-server] Fatal error: ${error.message}`);
        return NextResponse.json({ success: false, results: null, error: error.message }, { status: 502 });
    }
    return NextResponse.json({ success: false, results: null, error: 'An unknown error occurred' }, { status: 502 });
  }
}
