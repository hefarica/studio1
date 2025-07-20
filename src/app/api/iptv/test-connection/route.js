import { NextResponse } from 'next/server';

const CORS_PROXIES = [
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://api.allorigins.win/get?url=',
  'https://cors-anywhere.herokuapp.com/',
  'https://thingproxy.freeboard.io/fetch/',
];

export async function POST(request) {
  try {
    const { url, username, password } = await request.json();
    
    if (!url || !username || !password) {
      return NextResponse.json(
        { error: 'URL, username y password son requeridos' },
        { status: 400 }
      );
    }

    const testUrl = `${url}/player_api.php?username=${username}&password=${password}&action=get_server_info`;
    
    // Intentar conexión directa primero
    try {
      const directResponse = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      if (directResponse.ok) {
        const data = await directResponse.json();
        return NextResponse.json({
          success: true,
          data,
          method: 'direct'
        });
      }
    } catch (directError) {
      console.log('Conexión directa falló, probando proxies:', directError.message);
    }

    // Probar con proxies CORS
    for (let i = 0; i < CORS_PROXIES.length; i++) {
      const proxy = CORS_PROXIES[i];
      
      try {
        const proxyUrl = proxy + encodeURIComponent(testUrl);
        
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
          timeout: 15000,
        });

        if (response.ok) {
          const data = await response.json();
          
          // Manejar respuesta de allorigins.win
          if (data.contents) {
            const parsedData = JSON.parse(data.contents);
            return NextResponse.json({
              success: true,
              data: parsedData,
              method: 'proxy',
              proxy: proxy.split('/')[2]
            });
          }
          
          // Respuesta directa del proxy
          if (data.server_info || data.user_info || Array.isArray(data)) {
            return NextResponse.json({
              success: true,
              data,
              method: 'proxy',
              proxy: proxy.split('/')[2]
            });
          }
        }
      } catch (proxyError) {
        console.log(`Proxy ${proxy.split('/')[2]} falló:`, proxyError.message);
        continue;
      }
    }

    return NextResponse.json(
      { 
        error: 'No se pudo establecer conexión con el servidor IPTV',
        details: 'Todos los métodos de conexión fallaron'
      },
      { status: 502 }
    );

  } catch (error) {
    console.error('Error en test-connection:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
