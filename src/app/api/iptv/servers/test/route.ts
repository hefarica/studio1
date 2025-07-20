import { NextRequest, NextResponse } from 'next/server';
import { IPTVCore } from '@/lib/iptv-core';
import { IPTVErrorHandler } from '@/lib/error-handler';
import { IPTVServer } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const serverData = await request.json();
    
    // Validaciones
    const requiredFields = ['name', 'url', 'username', 'password'];
    const missingFields = requiredFields.filter(field => !serverData[field]?.trim());
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Campos requeridos faltantes: ${missingFields.join(', ')}`,
        code: 'MISSING_FIELDS',
        missingFields
      }, { status: 400 });
    }

    // Validar formato de URL
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
      // Usar el sistema de retry con manejo de errores
      const result = await IPTVErrorHandler.handleRetry(
        async () => {
          return await iptvCore.testServerConnection({
            ...serverData,
            id: 'test_server',
            channels: 0,
            lastScan: null,
            status: 'idle',
            protocol: null,
            categories: [],
            totalChannels: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          } as IPTVServer);
        },
        { 
          serverName: serverData.name, 
          operationType: 'connection_test' 
        },
        5 // máximo 5 intentos
      );

      if (result.success) {
        const protocol = result.data ? iptvCore.detectProtocol(result.data) : null;
        const duration = Date.now() - startTime;

        console.log(`✅ [TEST] ${serverData.name} exitoso en ${Math.round(duration/1000)}s`);

        return NextResponse.json({
          success: true,
          data: {
            protocol,
            serverInfo: result.data?.server_info || null,
            userInfo: result.data?.user_info || null,
            connectionTime: result.duration,
            totalDuration: Math.round(duration / 1000),
            timestamp: new Date().toISOString()
          }
        });
      } else {
        throw new Error(result.error || 'Test de conexión falló');
      }

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
