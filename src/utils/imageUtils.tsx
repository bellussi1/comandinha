import Image from "next/image";
import { customImageLoader, isExternalImage, optimizeImgurUrl, generateImageSrcSet } from "./imageLoader";

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  quality?: number;
}

/**
 * Componente unificado para tratamento de imagens de produtos
 * Otimiza imagens externas através do proxy e usa Next.js Image para locais
 */
export function ProductImage({
  src,
  alt,
  className = "object-cover",
  fill = false,
  width,
  height,
  priority = false,
  quality = 75
}: ProductImageProps) {
  const imageSrc = src?.trimEnd();

  // Se não há imagem, usar placeholder
  if (!imageSrc) {
    return (
      <Image
        src="/placeholder.svg"
        alt={alt}
        className={className}
        {...(fill ? { fill: true } : { width: width || 400, height: height || 300 })}
      />
    );
  }

  // Otimizar URLs do Imgur
  let optimizedSrc = imageSrc;
  if (imageSrc.includes('imgur.com')) {
    optimizedSrc = optimizeImgurUrl(imageSrc, 'l');
  }

  // Se é imagem externa, usar img com srcset otimizado
  if (isExternalImage(optimizedSrc)) {
    const srcSet = generateImageSrcSet(optimizedSrc, [320, 640, 960, 1280]);
    const sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={customImageLoader({ src: optimizedSrc, width: width || 800, quality })}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        className={className}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "low"}
        decoding="async"
        onError={(e) => {
          e.currentTarget.src = '/placeholder.svg';
          e.currentTarget.srcset = '';
          e.currentTarget.onerror = null;
        }}
        {...(width && height ? { width, height } : {})}
      />
    );
  }

  // Imagem local - usar Next.js Image
  return (
    <Image
      src={optimizedSrc}
      alt={alt}
      className={className}
      priority={priority}
      quality={quality}
      {...(fill ? { fill: true } : { width: width || 400, height: height || 300 })}
    />
  );
}

/**
 * Valida e processa uma URL de imagem
 */
export function processImageUrl(url?: string): string {
  if (!url) return "/placeholder.svg";
  
  const trimmedUrl = url.trimEnd();
  return trimmedUrl || "/placeholder.svg";
}