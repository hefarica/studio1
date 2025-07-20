'use client';
import { NextRequest, NextResponse } from 'next/server';
import { CONFIG } from '@/lib/constants';

function isValidIPTVResponse(data: any): boolean {
  if (!data) return false;
  
  if (data.server_info || data.user_info) return true;
  
  if (Array.isArray(data) && data.length > 0) {
    const firstItem = data[0];
    if (firstItem.category_id || firstItem.category_name) return true;
    if (firstItem.stream_id || firstItem.name) return true;
  }
  
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const { url, options = {} } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'URL es requerida',
          code: 'MISSING_URL' 
        },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { 
          success: false, 
          error: 'URL inválida',
          code: 'INVALID_URL' 
        },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    let lastError: string = '';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

    try {
      console.log(`[PROXY] Intentando conexión directa: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Studio1-IPTV-Constructor/2.0',
          'Accept': 'application/json, text/plain, */*',
          'Cache-Control': 'no-cache',
          ...options.headers,
        }
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        const duration = Date.now() - startTime;
        
        console.log(`✅ [PROXY] Conexión directa exitosa (${duration}ms)`);
        
        return NextResponse.json({ 
          success: true, 
          data,
          method: 'direct',
          duration,
          timestamp: new Date().toISOString()
        });
      } else if (response.status === 512) {
        lastError = `Server Error 512: ${response.statusText}`;
        console.log(`🚫 [PROXY] Error 512 detectado`);
      } else {
        lastError = `HTTP ${response.status}: ${response.statusText}`;
        console.log(`⚠️ [PROXY] Error HTTP ${response.status}`);
      }
      
    } catch (directError: any) {
      lastError = directError.message;
      console.log(`❌ [PROXY] Conexión directa fallida: ${directError.message}`);
    } finally {
        clearTimeout(timeoutId);
    }

    const duration = Date.now() - startTime;
    
    let errorCode = 'CONNECTION_FAILED';
    let statusCode = 502;
    
    if (lastError.includes('512')) {
      errorCode = 'SERVER_ERROR_512';
      statusCode = 512;
    } else if (lastError.includes('timeout') || lastError.includes('aborted')) {
      errorCode = 'TIMEOUT';
      statusCode = 408;
    } else if (lastError.includes('unexpected') || lastError.includes('invalid')) {
      errorCode = 'UNEXPECTED_RESPONSE';
      statusCode = 502;
    }

    console.log(`💥 [PROXY] Todos los métodos fallaron después de ${duration}ms`);

    return NextResponse.json(
      { 
        success: false, 
        error: lastError || 'Todos los métodos de conexión fallaron',
        code: errorCode,
        duration,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );

  } catch (error: any) {
    console.error(`💥 [PROXY] Error inesperado:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor proxy',
        code: 'INTERNAL_ERROR',
        originalError: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
