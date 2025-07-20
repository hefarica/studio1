import { NextResponse } from 'next/server';
import { IPTVCore } from '@/lib/iptv-core';
import { IPTVErrorHandler } from '@/lib/error-handler';

export async function POST(request) {
  try {
    const { server } = await request.json();
    
    if (!server || !server.url || !server.username || !server.password) {
      return NextResponse.json(
        { error: 'Datos del servidor incompletos' },
        { status: 400 }
      );
    }

    const iptvCore = new IPTVCore();
    
    const result = await IPTVErrorHandler.handleRetry(
      () => iptvCore.scanServer(server),
      { serverName: server.name, operationType: 'full_scan' },
      3 // 3 intentos para un escaneo completo
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        results: result
      });
    } else {
      throw new Error(result.errors.join(', ') || 'El escaneo del servidor falló');
    }

  } catch (error) {
    console.error('Error en scan-server:', error);
    const analyzedError = IPTVErrorHandler.analyzeError(error);
    
    return NextResponse.json({
      success: false,
      error: analyzedError.message,
      code: analyzedError.code,
      suggestions: analyzedError.suggestions,
    }, { status: 500 });
  }
}
