import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToIPTVServer } from '@/lib/iptvServerConnector';

export const runtime = 'nodejs'; // Force Node.js runtime for compatibility

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

    const { url, username, password } = parsedServer.data;

    console.log(`[API/scan-server] Iniciando escaneo holístico para: ${parsedServer.data.name}`);

    const connectionResult = await connectToIPTVServer({
      url,
      username,
      password,
      serverType: 'auto',
      enableDuplicateFilter: true,
    });

    if (!connectionResult.success) {
      throw new Error(connectionResult.errorMessage || 'Falló la conexión y extracción de canales.');
    }

    const results = {
      serverInfo: connectionResult.serverInfo,
      categories: [], // The new connector doesn't provide categories directly, this can be adapted.
      totalChannels: connectionResult.channels.length,
      duplicatesFound: connectionResult.duplicatesFound,
      duplicatesRemoved: connectionResult.duplicatesRemoved,
      processingTime: connectionResult.processingTime,
      protocol: connectionResult.serverInfo?.serverType || 'auto-detected',
      error: null,
      channels: connectionResult.channels, // Return full channel list
    };

    return NextResponse.json({ success: true, results });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[API/scan-server] Fatal error: ${errorMessage}`);
    return NextResponse.json({ success: false, results: null, error: errorMessage }, { status: 502 });
  }
}
