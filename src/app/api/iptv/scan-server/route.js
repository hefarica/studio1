import { NextResponse } from 'next/server';

const CORS_PROXIES = [
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://api.allorigins.win/get?url=',
];

async function makeRequest(url) {
  // Intentar conexión directa
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.log('Conexión directa falló:', error.message);
  }

  // Probar proxies
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy + encodeURIComponent(url);
      const response = await fetch(proxyUrl, {
        timeout: 15000,
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.contents) {
          return JSON.parse(data.contents);
        }
        
        if (data.server_info || data.user_info || Array.isArray(data)) {
          return data;
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  throw new Error('No se pudo conectar al servidor');
}

export async function POST(request) {
  try {
    const { server } = await request.json();
    
    if (!server || !server.url || !server.username || !server.password) {
      return NextResponse.json(
        { error: 'Datos del servidor incompletos' },
        { status: 400 }
      );
    }

    const results = {
      serverInfo: null,
      categories: [],
      totalChannels: 0,
      protocol: 'Unknown',
      error: null
    };

    try {
      // Obtener información del servidor
      const serverInfoUrl = `${server.url}/player_api.php?username=${server.username}&password=${server.password}&action=get_server_info`;
      results.serverInfo = await makeRequest(serverInfoUrl);
      
      if (results.serverInfo) {
        results.protocol = detectProtocol(results.serverInfo);
      }

      // Obtener categorías
      const categoriesUrl = `${server.url}/player_api.php?username=${server.username}&password=${server.password}&action=get_live_categories`;
      results.categories = await makeRequest(categoriesUrl);
      
      if (!Array.isArray(results.categories)) {
        results.categories = [];
      }

      // Contar canales en cada categoría (muestra limitada para evitar timeout)
      let totalChannels = 0;
      const maxCategoriesToCheck = Math.min(results.categories.length, 5);
      
      for (let i = 0; i < maxCategoriesToCheck; i++) {
        const category = results.categories[i];
        try {
          const channelsUrl = `${server.url}/player_api.php?username=${server.username}&password=${server.password}&action=get_live_streams&category_id=${category.category_id || category.id}`;
          const channels = await makeRequest(channelsUrl);
          
          if (Array.isArray(channels)) {
            totalChannels += channels.length;
          }
        } catch (error) {
          console.log(`Error obteniendo canales de categoría ${category.category_name}:`, error.message);
        }
      }
      
      results.totalChannels = totalChannels;

      return NextResponse.json({
        success: true,
        results
      });

    } catch (error) {
      results.error = error.message;
      return NextResponse.json({
        success: false,
        results,
        error: error.message
      });
    }

  } catch (error) {
    console.error('Error en scan-server:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

function detectProtocol(data) {
  if (data.server_info && data.user_info) {
    return 'Xtream Codes';
  } else if (typeof data === 'string' && data.includes('#EXTINF')) {
    return 'M3U Plus';
  } else if (Array.isArray(data)) {
    return 'Panel API';
  } else {
    return 'Desconocido';
  }
}
