import { TextRecognition } from "@capacitor-mlkit/text-recognition";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { isNative, NativeUnavailableError } from "./platform";

export { TextRecognition, Camera, CameraResultType, CameraSource };

/**
 * Recognizes text from an image using Google ML Kit on native.
 * Accepts a file path or photo Blob.
 * Throws NativeUnavailableError when called on web.
 */
export async function recognizeText(photo: Blob | string): Promise<string> {
  if (!isNative()) {
    throw new NativeUnavailableError("OCR text recognition");
  }

  let imagePath: string;
  if (typeof photo === "string") {
    imagePath = photo;
  } else if ((photo as unknown as { path?: string }).path) {
    imagePath = (photo as unknown as { path: string }).path;
  } else if ((photo as unknown as { webPath?: string }).webPath) {
    imagePath = (photo as unknown as { webPath: string }).webPath;
  } else {
    imagePath = URL.createObjectURL(photo);
  }

  const result = await TextRecognition.processImage({ path: imagePath });
  return result?.text || "";
}
