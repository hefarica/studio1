import { NextResponse } from 'next/server';
import { IPTVCore } from '@/lib/iptv-core';
import { IPTVErrorHandler } from '@/lib/error-handler';

export async function POST(request) {
  try {
    const { url, username, password } = await request.json();
    
    if (!url || !username || !password) {
      return NextResponse.json(
        { error: 'URL, username y password son requeridos' },
        { status: 400 }
      );
    }

    const iptvCore = new IPTVCore();
    const server = { url, username, password }; // Objeto server simulado para el método

    const categories = await IPTVErrorHandler.handleRetry(
        () => iptvCore.getCategories(server),
        { serverName: url, operationType: 'get_categories' }
    );

    return NextResponse.json({
      success: true,
      categories: Array.isArray(categories) ? categories : []
    });

  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    const analyzedError = IPTVErrorHandler.analyzeError(error);
    return NextResponse.json(
      { error: 'Error obteniendo categorías', details: analyzedError.message },
      { status: 500 }
    );
  }
}
