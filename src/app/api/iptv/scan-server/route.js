import { NextResponse } from 'next/server';
import pLimit from 'p-limit';
import { CONFIG } from '@/lib/constants';

async function makeRequest(fullUrl) {
    const res = await fetch(fullUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'application/json' },
    });

    if (res.status >= 500) {
        console.warn(`[API/scan-server] Servidor en ${fullUrl} responde con ${res.status}`);
        return null; // Return null to handle gracefully
    }
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} en ${fullUrl}`);
    }
    return res.json();
}

export async function POST(request) {
  try {
    const { server } = await request.json();
    
    if (!server || !server.url || !server.username || !server.password) {
      return NextResponse.json({ error: 'Datos del servidor incompletos' }, { status: 400 });
    }

    const results = {
      serverInfo: null,
      categories: [],
      totalChannels: 0,
      protocol: 'Unknown',
      error: null
    };

    try {
      const serverInfoUrl = `${server.url}/player_api.php?username=${server.username}&password=${server.password}&action=get_server_info`;
      results.serverInfo = await makeRequest(serverInfoUrl);

      if (results.serverInfo) {
        results.protocol = 'Xtream Codes';
      } else {
        throw new Error('No se pudo obtener la información del servidor. Verifique las credenciales y la URL.');
      }

      const categoriesUrl = `${server.url}/player_api.php?username=${server.username}&password=${server.password}&action=get_live_categories`;
      const categories = await makeRequest(categoriesUrl);
      
      if (!Array.isArray(categories)) {
        results.categories = [];
      } else {
        results.categories = categories;
      }
      
      const limit = pLimit(CONFIG.MAX_PARALLEL);

      const channelCounts = await Promise.all(
        results.categories.map(category =>
          limit(async () => {
            if (!category || !category.category_id) return 0;
            try {
              const channelsUrl = `${server.url}/player_api.php?username=${server.username}&password=${server.password}&action=get_live_streams&category_id=${category.category_id}`;
              const channels = await makeRequest(channelsUrl);
              return Array.isArray(channels) ? channels.length : 0;
            } catch (error) {
              console.warn(`Error obteniendo canales de categoría ${category.category_name}: ${error.message}`);
              return 0;
            }
          })
        )
      );

      results.totalChannels = channelCounts.reduce((acc, count) => acc + count, 0);

      return NextResponse.json({ success: true, results });

    } catch (error) {
      results.error = error.message;
      return NextResponse.json({ success: false, results, error: error.message });
    }

  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}