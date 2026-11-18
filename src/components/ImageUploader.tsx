import { useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, UploadCloud, X } from "lucide-react";

import { uploadImages } from "../api";

const MAX_BYTES = 4.5 * 1024 * 1024; // backend limit is 5 MB per image
const MAX_FILES = 6;
const MAX_DIMENSION = 1600;

/** Shrink big photos in the browser (resize + WebP) so they fit the 5 MB limit. */
async function shrinkImage(file: File): Promise<File> {
  if (file.type === "image/gif" || !file.type.startsWith("image/")) return file;
  if (file.size <= 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

/**
 * Multi-image field. Images are stored as an ordered array of URLs.
 * Supports file upload (to backend/R2) and pasting an external URL as a fallback.
 */
export function ImageUploader({
  images,
  onChange,
  uploadConfigured,
}: {
  images: string[];
  onChange: (next: string[]) => void;
  uploadConfigured: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    if (files.length > MAX_FILES) {
      setError(`Select at most ${MAX_FILES} images at a time.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const prepared = await Promise.all(Array.from(files).map(shrinkImage));
      const tooBig = prepared.find((f) => f.size > MAX_BYTES);
      if (tooBig) {
        throw new Error(`"${tooBig.name}" is still over 5 MB after compression. Please use a smaller image.`);
      }
      const urls = await uploadImages(prepared);
      onChange([...images, ...urls]);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    onChange([...images, url]);
    setUrlInput("");
  };

  const removeAt = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="font-bold text-slate-700">Product images</label>
      <p className="text-[10px] text-slate-400">
        The first image is the main thumbnail. Drag to the box or paste a URL.
      </p>

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((src, i) => (
            <div key={`${src}-${i}`} className="relative size-16 overflow-hidden rounded-lg border border-slate-200">
              <img src={src} alt="" className="size-full object-cover" />
              {i === 0 && (
                <span className="absolute left-0 top-0 bg-slate-900/80 px-1 py-0.5 text-[8px] font-bold text-white">
                  MAIN
                </span>
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-0 top-0 flex size-4 items-center justify-center bg-red-500 text-white hover:bg-red-600"
                title="Remove image"
              >
                <X className="size-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-4 text-center hover:border-slate-300"
      >
        {uploading ? (
          <>
            <Loader2 className="size-5 animate-spin text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-500">Uploading…</span>
          </>
        ) : (
          <>
            <UploadCloud className="size-5 text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-500">
              {uploadConfigured ? "Click or drop images here" : "File upload unavailable — paste a URL below"}
            </span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          disabled={!uploadConfigured}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {!uploadConfigured && (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-600">
          <ImagePlus className="size-3" /> Set the R2_* env vars on the backend to enable direct uploads.
        </p>
      )}

      {/* URL fallback */}
      <div className="mt-2 flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
            placeholder="https://… paste image URL"
            className="w-full h-9 rounded-xl border border-slate-200 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <button
          type="button"
          onClick={addUrl}
          className="rounded-xl bg-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-300"
        >
          Add
        </button>
      </div>

      {error && <p className="mt-1 text-[11px] font-semibold text-red-600">{error}</p>}
    </div>
  );
}
