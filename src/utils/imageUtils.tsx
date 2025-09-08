import Image from "next/image";

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
}

/**
 * Componente unificado para tratamento de imagens de produtos
 * Lida com URLs HTTP e fallback para placeholder
 */
export function ProductImage({ 
  src, 
  alt, 
  className = "object-cover", 
  fill = false,
  width,
  height 
}: ProductImageProps) {
  const imageSrc = src?.trimEnd();
  
  if (imageSrc?.startsWith('http')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageSrc}
        alt={alt}
        className={className}
        onError={(e) => {
          e.currentTarget.src = '/placeholder.svg';
          e.currentTarget.onerror = null;
        }}
        {...(width && height ? { width, height } : {})}
      />
    );
  }

  return (
    <Image
      src={imageSrc || "/placeholder.svg"}
      alt={alt}
      className={className}
      {...(fill ? { fill } : { width: width || 400, height: height || 300 })}
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