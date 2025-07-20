import { NextResponse } from 'next/server';
import { IPTVCore } from '@/lib/iptv-core';
import { IPTVErrorHandler } from '@/lib/error-handler';

export async function POST(request) {
  try {
    const { url, username, password, categoryId } = await request.json();
    
    if (!url || !username || !password || !categoryId) {
      return NextResponse.json(
        { error: 'Todos los parámetros son requeridos' },
        { status: 400 }
      );
    }

    const iptvCore = new IPTVCore();
    const server = { url, username, password }; // Objeto server simulado
    const category = { category_id: categoryId, category_name: `ID ${categoryId}` };

    const channels = await IPTVErrorHandler.handleRetry(
        () => iptvCore.getChannelsFromCategory(server, category),
        { serverName: url, operationType: `get_channels_cat_${categoryId}` }
    );

    return NextResponse.json({
      success: true,
      channels: Array.isArray(channels) ? channels : []
    });

  } catch (error) {
    console.error('Error obteniendo canales:', error);
     const analyzedError = IPTVErrorHandler.analyzeError(error);
    return NextResponse.json(
      { error: 'Error obteniendo canales', details: analyzedError.message },
      { status: 500 }
    );
  }
}
