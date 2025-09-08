import api from "./api";

export interface UploadResponse {
  url: string;
  filename: string;
}

/**
 * Upload de imagem usando multipart/form-data
 */
export const uploadImage = async (file: File): Promise<UploadResponse> => {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error("Erro ao fazer upload da imagem:", error);
    throw error;
  }
};

/**
 * Upload de múltiplas imagens usando multipart/form-data
 */
export const uploadMultipleImages = async (files: File[]): Promise<UploadResponse[]> => {
  try {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`images[${index}]`, file);
    });

    const response = await api.post('/upload/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error("Erro ao fazer upload das imagens:", error);
    throw error;
  }
};

/**
 * Remove imagem do servidor
 */
export const removeImage = async (filename: string): Promise<boolean> => {
  try {
    await api.delete(`/upload/image/${filename}`);
    return true;
  } catch (error) {
    console.error("Erro ao remover imagem:", error);
    throw error;
  }
};