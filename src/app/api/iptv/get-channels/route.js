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
    console.log('Conexión directa falló');
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
        
        return data;
      }
    } catch (error) {
      continue;
    }
  }
  
  throw new Error('No se pudo conectar al servidor');
}

export async function POST(request) {
  try {
    const { url, username, password, categoryId } = await request.json();
    
    if (!url || !username || !password || !categoryId) {
      return NextResponse.json(
        { error: 'Todos los parámetros son requeridos' },
        { status: 400 }
      );
    }

    const channelsUrl = `${url}/player_api.php?username=${username}&password=${password}&action=get_live_streams&category_id=${categoryId}`;
    const channels = await makeRequest(channelsUrl);

    return NextResponse.json({
      success: true,
      channels: Array.isArray(channels) ? channels : []
    });

  } catch (error) {
    console.error('Error obteniendo canales:', error);
    return NextResponse.json(
      { error: 'Error obteniendo canales', details: error.message },
      { status: 500 }
    );
  }
}
