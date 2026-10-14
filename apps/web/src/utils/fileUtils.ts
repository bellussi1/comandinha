/**
 * Utilities para tratamento de arquivos
 */

/**
 * Converte um arquivo para base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (reader.result) {
        resolve(reader.result as string);
      } else {
        reject(new Error("Erro ao ler arquivo"));
      }
    };
    
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

/**
 * Valida se um arquivo é uma imagem válida
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  return validTypes.includes(file.type);
}

/**
 * Valida o tamanho máximo do arquivo (em MB)
 */
export function isValidFileSize(file: File, maxSizeMB: number = 5): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Processa um arquivo de imagem para upload
 * Valida tipo e tamanho, converte para base64 se necessário
 */
export async function processImageFile(
  file: File, 
  options: {
    maxSizeMB?: number;
    convertToBase64?: boolean;
  } = {}
): Promise<string | File> {
  const { maxSizeMB = 5, convertToBase64 = false } = options;
  
  // Validações
  if (!isValidImageFile(file)) {
    throw new Error("Tipo de arquivo inválido. Use JPEG, PNG, GIF ou WebP.");
  }
  
  if (!isValidFileSize(file, maxSizeMB)) {
    throw new Error(`Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`);
  }
  
  // Conversão se necessária
  if (convertToBase64) {
    return await fileToBase64(file);
  }
  
  return file;
}