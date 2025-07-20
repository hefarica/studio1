import { NextResponse } from 'next/server';
import { IPTVCore } from '@/lib/iptv-core';
import { IPTVErrorHandler } from '@/lib/error-handler';

export async function POST(request) {
  try {
    const serverData = await request.json();
    
    if (!serverData.url || !serverData.username || !serverData.password) {
      return NextResponse.json(
        { success: false, error: 'URL, username y password son requeridos' },
        { status: 400 }
      );
    }

    const iptvCore = new IPTVCore();
    
    const result = await IPTVErrorHandler.handleRetry(
      () => iptvCore.testServerConnection(serverData),
      { serverName: serverData.name, operationType: 'connection_test' },
      5 // 5 intentos para la prueba de conexión
    );

    if (result.success) {
        const protocol = result.data ? iptvCore.detectProtocol(result.data) : null;
        return NextResponse.json({
          success: true,
          data: {
            ...result.data,
            protocol,
          },
          method: 'proxy'
        });
    } else {
        throw new Error(result.error || 'Test de conexión falló después de múltiples reintentos');
    }

  } catch (error) {
    console.error('Error en test-connection:', error);
    const analyzedError = IPTVErrorHandler.analyzeError(error);

    return NextResponse.json({
      success: false,
      error: analyzedError.message,
      code: analyzedError.code,
      suggestions: analyzedError.suggestions,
      isRetryable: analyzedError.isRetryable,
      severity: analyzedError.severity,
    }, { 
      status: analyzedError.code === 'SERVER_ERROR_512' ? 512 : 502 
    });
  }
}
