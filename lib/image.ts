/**
 * Shrinks a photo in the browser before it is uploaded.
 *
 * A phone camera produces 3–8 MB per shot. Uploading that from a damaged
 * network is slow enough that people give up mid-report, and the bucket's own
 * 3 MB ceiling would reject a fair share of them outright. What the board needs
 * is a face big enough to recognise, which is a fraction of that.
 *
 * Done on the client rather than the server on purpose: the bytes never leave
 * the device in the first place, so the saving is on the upload, which is the
 * leg that actually fails.
 */

const MAX_EDGE = 1400;
const QUALITY = 0.82;

export async function compressImage(file: File): Promise<File> {
  // Anything already small enough is left alone: re-encoding it would only
  // lose detail for no gain.
  if (file.size < 400_000) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return file;

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );

  // If the encode failed, or somehow produced something larger, keep the
  // original: a working upload beats a clever one.
  if (!blob || blob.size >= file.size) return file;

  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
}
