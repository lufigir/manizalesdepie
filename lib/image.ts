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

export async function compressImage(
  file: File,
  /** The longest edge to keep. The default is what a board of lost animals
   *  needs to show a recognisable face; the demo asks for less, because its
   *  photos travel inside a server action rather than to a bucket and a
   *  server action is not a file transport (see `animal-form.tsx`). */
  maxEdge: number = MAX_EDGE,
): Promise<File> {
  // Anything already small enough is left alone: re-encoding it would only
  // lose detail for no gain.
  if (file.size < 400_000 && maxEdge === MAX_EDGE) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
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

/**
 * The file as a `data:` URL.
 *
 * What replaces the upload. With no bucket behind the app, a photo has
 * nowhere to be stored and no URL to be served from, so it travels inline
 * with the report and lives in the reader's own browser for the visit.
 * Shrink first: base64 costs a third more than the bytes it encodes.
 */
export async function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // `readAsDataURL` always produces a string; the union is FileReader's,
    // shared with `readAsArrayBuffer`.
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("No se pudo leer la foto"));
    reader.onerror = () => reject(new Error("No se pudo leer la foto"));
    reader.readAsDataURL(file);
  });
}
