import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { isNative } from "./platform";

export async function takePhoto(): Promise<Blob> {
  if (isNative()) {
    const photo = await Camera.getPhoto({
      quality: 70,
      width: 1600,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      correctOrientation: true,
    });

    if (!photo.webPath) {
      throw new Error("No photo URI returned from native camera");
    }

    const response = await fetch(photo.webPath);
    const blob = await response.blob();
    Object.defineProperty(blob, "path", {
      value: photo.path || photo.webPath,
      writable: true,
      enumerable: true,
    });
    return blob;
  }

  // Web fallback: a hidden <input type="file" accept="image/*" capture="environment">
  return new Promise<Blob>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Camera is unavailable in non-browser environments"));
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.style.display = "none";
    document.body.appendChild(input);

    input.onchange = () => {
      const file = input.files?.[0];
      if (input.parentNode) {
        input.parentNode.removeChild(input);
      }
      if (file) {
        resolve(file);
      } else {
        reject(new Error("Photo selection was cancelled"));
      }
    };

    input.oncancel = () => {
      if (input.parentNode) {
        input.parentNode.removeChild(input);
      }
      reject(new Error("Photo selection was cancelled"));
    };

    input.click();
  });
}
