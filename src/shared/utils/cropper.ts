// src/shared/utils/cropper.ts
// Returns a JPEG File ready for upload.
export async function getCroppedImageFile(
    imageSrc: string,
    cropPixels: { x: number; y: number; width: number; height: number },
    outputMaxLongSide = 800,
    outFilename = "avatar.jpg"
  ): Promise<File> {
    const imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageSrc;
    });
  
    let bitmap: ImageBitmap | null = null;
    try {
      if ("createImageBitmap" in window) {
        bitmap = await createImageBitmap(imgEl, {
          imageOrientation: "from-image",
        } as any);
      }
    } catch {}
  
    const srcW = bitmap ? bitmap.width : imgEl.naturalWidth || imgEl.width;
    const srcH = bitmap ? bitmap.height : imgEl.naturalHeight || imgEl.height;
  
    const cx = Math.round(cropPixels.x);
    const cy = Math.round(cropPixels.y);
    const cw = Math.round(cropPixels.width);
    const ch = Math.round(cropPixels.height);
  
    const sx = Math.max(0, Math.min(cx, srcW - 1));
    const sy = Math.max(0, Math.min(cy, srcH - 1));
    const sw = Math.max(1, Math.min(cw, srcW - sx));
    const sh = Math.max(1, Math.min(ch, srcH - sy));
  
    let targetW = sw;
    let targetH = sh;
    const longSide = Math.max(sw, sh);
    if (longSide > outputMaxLongSide) {
      const scale = outputMaxLongSide / longSide;
      targetW = Math.max(1, Math.round(sw * scale));
      targetH = Math.max(1, Math.round(sh * scale));
    }
  
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
  
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
  
    if (bitmap) {
      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, targetW, targetH);
      bitmap.close?.();
    } else {
      ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, targetW, targetH);
    }
  
    const blob: Blob = await new Promise((resolve) => {
      if (canvas.toBlob) {
        canvas.toBlob(
          (b) => resolve(b || dataURLToBlob(canvas.toDataURL("image/jpeg", 0.92))),
          "image/jpeg",
          0.92
        );
      } else {
        resolve(dataURLToBlob(canvas.toDataURL("image/jpeg", 0.92)));
      }
    });
  
    return new File(
      [blob],
      outFilename.replace(/\.(png|webp|avif|heic|heif)$/i, ".jpg"),
      { type: "image/jpeg" }
    );
  }
  
  function dataURLToBlob(dataURL: string): Blob {
    const parts = dataURL.split(",");
    const byteString = atob(parts[1]);
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: mime });
  }
  