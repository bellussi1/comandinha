"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { Upload, X, Image as ImageIcon, AlertCircle } from "lucide-react";
import { Button } from "./button";
import { Label } from "./label";
import { cn } from "@/src/lib/utils";

interface ImageUploadProps {
  value?: string | File;
  onChange: (value: File | string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  maxSize?: number; // in MB
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  disabled = false,
  className,
  label = "Imagem",
  maxSize = 2,
}: ImageUploadProps) {
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string>("");

  // Update preview when value changes
  React.useEffect(() => {
    if (value instanceof File) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (typeof value === 'string' && value) {
      setPreviewUrl(value);
    } else {
      setPreviewUrl("");
    }
  }, [value]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return;
      
      setError("");
      setIsLoading(true);

      try {
        const file = acceptedFiles[0];
        
        if (!file) {
          setError("Nenhum arquivo selecionado");
          return;
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
          setError("Por favor, selecione apenas arquivos de imagem");
          return;
        }

        // Validate file format (PNG or JPEG only)
        const validTypes = ["image/png", "image/jpeg", "image/jpg"];
        if (!validTypes.includes(file.type)) {
          setError("Apenas arquivos PNG e JPEG são aceitos");
          return;
        }

        // Validate file size (maxSize MB limit)
        const maxSizeBytes = maxSize * 1024 * 1024;
        if (file.size > maxSizeBytes) {
          setError(`O arquivo deve ter no máximo ${maxSize}MB`);
          return;
        }

        // Pass the file directly
        onChange(file);
      } catch (error) {
        setError("Erro ao processar a imagem");
        console.error("Erro no upload:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [disabled, onChange, maxSize]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpeg", ".jpg"],
    },
    maxFiles: 1,
    disabled,
  });

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    } else {
      onChange("");
    }
    setError("");
    setPreviewUrl("");
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      
      <div className="space-y-2">
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragActive && !isDragReject && "border-primary bg-primary/5",
            isDragReject && "border-destructive bg-destructive/5",
            disabled && "cursor-not-allowed opacity-50",
            value && "border-solid border-muted-foreground/20"
          )}
        >
          <input {...getInputProps()} />
          
          {isLoading ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-sm text-muted-foreground">Processando imagem...</p>
            </div>
          ) : previewUrl ? (
            <div className="space-y-2">
              <div className="relative inline-block">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  width={200}
                  height={128}
                  className="max-w-full h-32 object-cover rounded-md"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Clique ou arraste uma nova imagem para substituir
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {isDragActive
                    ? "Solte a imagem aqui..."
                    : "Arraste uma imagem ou clique para selecionar"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: PNG, JPEG • Tamanho máximo: {maxSize}MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}