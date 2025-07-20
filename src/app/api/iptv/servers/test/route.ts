import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { IPTVCore } from '@/lib/iptv-core';
import { IPTVErrorHandler } from '@/lib/error-handler';
import { IPTVServer } from '@/lib/types';

// Zod schema for validating the server info response
const ServerInfoResponseSchema = z.object({
  server_info: z.object({
    url: z.string().optional(),
    port: z.string().optional(),
    https_port: z.string().optional(),
    time_now: z.string().optional(),
    timezone: z.string().optional(),
  }).optional(),
  user_info: z.object({
    username: z.string().optional(),
    password: z.string().optional(),
    status: z.string().optional(),
    exp_date: z.string().nullable().optional(),
  }).optional(),
});


export async function POST(request: NextRequest) {
  try {
    const serverData: IPTVServer = await request.json();
    
    const requiredFields = ['name', 'url', 'username', 'password'];
    const missingFields = requiredFields.filter(field => !(serverData as any)[field]?.trim());
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Campos requeridos faltantes: ${missingFields.join(', ')}`,
        code: 'MISSING_FIELDS',
        missingFields
      }, { status: 400 });
    }

    try {
      new URL(serverData.url);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'URL del servidor inválida',
        code: 'INVALID_URL'
      }, { status: 400 });
    }

    console.log(`[TEST] Iniciando prueba de ${serverData.name}`);
    const startTime = Date.now();

    const iptvCore = new IPTVCore();
    
    try {
      const testUrl = `${serverData.url}/player_api.php?username=${serverData.username}&password=${serverData.password}&action=get_server_info`;
      
      const response = await fetch(testUrl, {
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      });

      if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const validation = ServerInfoResponseSchema.safeParse(data);

      if (!validation.success) {
          throw new Error(`Respuesta inválida del servidor: ${validation.error.message}`);
      }

      const protocol = iptvCore.detectProtocol(validation.data);
      const duration = Date.now() - startTime;
      
      console.log(`✅ [TEST] ${serverData.name} exitoso en ${Math.round(duration/1000)}s`);

      return NextResponse.json({
        success: true,
        data: {
          protocol,
          serverInfo: validation.data?.server_info || null,
          userInfo: validation.data?.user_info || null,
          connectionTime: duration,
          totalDuration: Math.round(duration / 1000),
          timestamp: new Date().toISOString()
        }
      });

    } catch (connectionError: any) {
      const analyzedError = IPTVErrorHandler.analyzeError(connectionError, {
        serverName: serverData.name,
        url: serverData.url
      });
      const duration = Date.now() - startTime;

      console.log(`❌ [TEST] ${serverData.name} falló: ${analyzedError.message}`);

      return NextResponse.json({
        success: false,
        error: analyzedError.message,
        code: analyzedError.code,
        suggestions: Array.isArray(analyzedError.suggestions) ? analyzedError.suggestions : [],
        isRetryable: analyzedError.isRetryable,
        severity: analyzedError.severity,
        duration: Math.round(duration / 1000),
        timestamp: new Date().toISOString()
      }, { 
        status: analyzedError.code === 'SERVER_ERROR_512' ? 512 : 502 
      });
    }

  } catch (error: any) {
    console.error('[TEST] Error inesperado:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      originalError: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
