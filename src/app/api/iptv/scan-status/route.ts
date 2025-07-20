import { NextRequest, NextResponse } from 'next/server';
import { activeScans } from '../scan-all/route';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scanId = searchParams.get('scanId');

  if (!scanId) {
    return NextResponse.json({ success: false, error: 'scanId is required' }, { status: 400 });
  }

  const scanData = activeScans.get(scanId);

  if (!scanData) {
    return NextResponse.json({ 
        success: false, 
        error: 'Scan not found or already completed',
        code: 'NOT_FOUND'
    }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      progress: scanData.progress,
      results: scanData.results,
      isComplete: scanData.progress.percentage === 100,
    },
  });
}
