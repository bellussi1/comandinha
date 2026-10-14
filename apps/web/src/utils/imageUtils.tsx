import Image from "next/image";
import { isExternalImage, optimizeImgurUrl } from "./imageLoader";

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
 * Carrega URLs externas diretamente no navegador e usa Next.js Image para locais.
 * Isso permite qualquer CDN HTTPS sem transformar o proxy do servidor em um fetch arbitrário.
 */
export function ProductImage({
  src,
  alt,
  className = "object-cover",
  fill = false,
  width,
  height,
  priority = false,
  quality = 75,
}: ProductImageProps) {
  const imageSrc = src?.trimEnd();

  // Se não há imagem, usar placeholder
  if (!imageSrc) {
    return (
      <Image
        src="/placeholder.svg"
        alt={alt}
        className={className}
        {...(fill
          ? { fill: true }
          : { width: width || 400, height: height || 300 })}
      />
    );
  }

  // Otimizar URLs do Imgur
  let optimizedSrc = imageSrc;
  if (imageSrc.includes("imgur.com")) {
    optimizedSrc = optimizeImgurUrl(imageSrc, "l");
  }

  // A URL externa vai direto ao navegador para funcionar com CDNs diversos.
  if (isExternalImage(optimizedSrc)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={optimizedSrc}
        alt={alt}
        className={className}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "low"}
        decoding="async"
        onError={(e) => {
          e.currentTarget.src = "/placeholder.svg";
          e.currentTarget.srcset = "";
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
      {...(fill
        ? { fill: true }
        : { width: width || 400, height: height || 300 })}
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
