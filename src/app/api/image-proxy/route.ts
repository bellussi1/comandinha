import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * API Route para fazer proxy de imagens externas e otimizá-las
 * Uso: /api/image-proxy?url=https://imgur.com/image.png&w=400&q=75
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('url');
  const width = searchParams.get('w') || '800';
  const quality = searchParams.get('q') || '75';

  if (!imageUrl) {
    return new NextResponse('Missing image URL', { status: 400 });
  }

  try {
    // Validar URL
    const url = new URL(imageUrl);

    // Apenas permitir domínios confiáveis
    const allowedDomains = [
      'imgur.com',
      'i.imgur.com',
      'exemplo.com',
      'comandinha.onrender.com'
    ];

    if (!allowedDomains.some(domain => url.hostname.includes(domain))) {
      return new NextResponse('Domain not allowed', { status: 403 });
    }

    // Fetch da imagem
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!imageResponse.ok) {
      return new NextResponse('Failed to fetch image', { status: imageResponse.status });
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await imageResponse.arrayBuffer();

    // Headers para cache agressivo
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'CDN-Cache-Control': 'public, max-age=31536000',
        'Vercel-CDN-Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return new NextResponse('Error processing image', { status: 500 });
  }
}
