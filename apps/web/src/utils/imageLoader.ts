/**
 * Custom image loader para otimizar imagens externas através do proxy
 */
export function customImageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  // Se a imagem já está no domínio local, retornar como está
  if (src.startsWith('/')) {
    return src;
  }

  // Se é uma URL externa, usar o proxy
  if (src.startsWith('http://') || src.startsWith('https://')) {
    const params = new URLSearchParams({
      url: src,
      w: width.toString(),
      q: (quality || 75).toString(),
    });

    return `/api/image-proxy?${params.toString()}`;
  }

  return src;
}

/**
 * Detecta se uma URL de imagem é externa
 */
export function isExternalImage(src?: string): boolean {
  if (!src) return false;
  return src.startsWith('http://') || src.startsWith('https://');
}

/**
 * Otimiza URL de imagem do Imgur
 */
export function optimizeImgurUrl(url: string, size: 's' | 'm' | 'l' | 'h' = 'm'): string {
  try {
    const imgurRegex = /i\.imgur\.com\/([a-zA-Z0-9]+)\.(jpg|jpeg|png|gif)/i;
    const match = url.match(imgurRegex);

    if (match) {
      const [, imageId, extension] = match;
      // Imgur suporta sufixos de tamanho: s (small), m (medium), l (large), h (huge)
      return `https://i.imgur.com/${imageId}${size}.${extension}`;
    }
  } catch (error) {
    console.error('Error optimizing Imgur URL:', error);
  }

  return url;
}

/**
 * Gera srcset para imagens responsivas
 */
export function generateImageSrcSet(baseUrl: string, sizes: number[] = [320, 640, 960, 1280]): string {
  return sizes
    .map(size => {
      const optimizedUrl = customImageLoader({ src: baseUrl, width: size });
      return `${optimizedUrl} ${size}w`;
    })
    .join(', ');
}
