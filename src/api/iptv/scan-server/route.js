import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerManager } from '@/lib/ServerManager';

export const runtime = 'nodejs';

const ServerSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  username: z.string(),
  password: z.string(),
});

export async function POST(request) {
  try {
    const { server } = await request.json();
    const parsedServer = ServerSchema.safeParse(server);

    if (!parsedServer.success) {
      return NextResponse.json({ error: 'Datos del servidor incompletos o inválidos', details: parsedServer.error.flatten() }, { status: 400 });
    }

    const { username, password } = parsedServer.data;
    console.log(`[API/scan-server] Iniciando escaneo holístico para: ${parsedServer.data.name}`);

    const serverManager = getServerManager();
    const connectionResult = await serverManager.connectToGensparkServer(username, password);
    
    if (!connectionResult.success) {
      throw new Error(connectionResult.error || 'Falló la conexión y extracción de canales.');
    }

    const channels = connectionResult.channels || [];
    const connection = serverManager.getConnection(connectionResult.connectionId);
    
    const results = {
      serverInfo: { serverName: 'Genspark IPTV Server' },
      categories: [...new Set(channels.map(c => c.group))],
      totalChannels: channels.length,
      duplicatesFound: connection?.metrics.duplicatesRemoved || 0,
      duplicatesRemoved: connection?.metrics.duplicatesRemoved || 0,
      processingTime: connection?.metrics.responseTime || 0,
      protocol: 'Xtream Codes (auto-detected)',
      error: null,
      channels: channels.map(c => ({...c, stream_id: c.id, category_id: c.group, stream_icon: c.logo})), // Adapt to legacy format if needed
    };

    return NextResponse.json({ success: true, results });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[API/scan-server] Fatal error: ${errorMessage}`);
    return NextResponse.json({ success: false, results: null, error: errorMessage }, { status: 502 });
  }
}
