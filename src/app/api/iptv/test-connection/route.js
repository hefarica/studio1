import { NextResponse } from 'next/server';

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
    
    const res = await fetch(testUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'application/json' },
    });

    if (res.status >= 500) {
      console.warn(`[API/test-connection] Servidor responde con ${res.status}: ${testUrl}`);
      // Return a non-error response to the client to be handled gracefully
      return NextResponse.json({ success: false, error: `El servidor respondió con un error ${res.status}`, status: res.status }, { status: 200 });
    }

    if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({ success: false, error: `Error HTTP ${res.status}: ${errorText}`, status: res.status }, { status: 200 });
    }

    const data = await res.json();
    
    return NextResponse.json({ success: true, data, method: 'proxy' });

  } catch (error) {
    console.error('Error en test-connection:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del proxy', details: error.message },
      { status: 500 }
    );
  }
}
