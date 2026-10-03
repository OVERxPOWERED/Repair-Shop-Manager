/**
 * Image resizing and compression utilities for job photos.
 */

export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Calculates new dimensions scaled down proportionally so neither side exceeds maxSide.
 * If dimensions are already within maxSide, original dimensions are preserved.
 */
export function fitWithin(width: number, height: number, maxSide: number = 1600): Dimensions {
  if (width <= 0 || height <= 0 || maxSide <= 0) {
    return { width: 0, height: 0 };
  }

  if (width <= maxSide && height <= maxSide) {
    return { width: Math.round(width), height: Math.round(height) };
  }

  const ratio = Math.min(maxSide / width, maxSide / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

/**
 * Draws an image blob to an off-screen HTML5 canvas, resizes to max 1600px,
 * and re-encodes as JPEG at the specified quality (0.7 by default).
 */
export async function compressImage(
  blob: Blob,
  maxSide: number = 1600,
  quality: number = 0.7
): Promise<Blob> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return blob;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const originalWidth = img.naturalWidth || img.width;
      const originalHeight = img.naturalHeight || img.height;
      const { width, height } = fitWithin(originalWidth, originalHeight, maxSide);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(blob);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (compressed) => {
          if (compressed) {
            resolve(compressed);
          } else {
            resolve(blob);
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = url;
  });
}
