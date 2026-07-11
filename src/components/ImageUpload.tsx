import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  bucket: string;
  value?: string | null;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
  /** Force output to a square of this size (px). Default 1080. Set to 0 to keep original. */
  size?: number;
  /** If set, reject uploads whose exact pixel dimensions don't match (no resize). */
  requireExactDimensions?: { width: number; height: number };
};

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res({ width: i.naturalWidth, height: i.naturalHeight });
      i.onerror = () => rej(new Error("Invalid image"));
      i.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Resize/crop an image file to a centered square PNG of `size`×`size`. */
async function resizeToSquare(file: File, size: number): Promise<Blob> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Invalid image"));
    i.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  // cover-crop centered
  const scale = Math.max(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const dx = (size - w) / 2;
  const dy = (size - h) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, dx, dy, w, h);
  return await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Encode failed"))), "image/png", 0.92)
  );
}

export function ImageUpload({ bucket, value, onChange, label, className, size = 1080, requireExactDimensions }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      if (requireExactDimensions) {
        const { width, height } = await getImageDimensions(file);
        if (width !== requireExactDimensions.width || height !== requireExactDimensions.height) {
          throw new Error(
            `مقاس الصورة لازم يكون ${requireExactDimensions.width}×${requireExactDimensions.height} بكسل بالظبط (نسبة 4:5). الصورة اللي رفعتها ${width}×${height}.`
          );
        }
      }
      const useResize = size > 0 && !requireExactDimensions;
      const blob = useResize ? await resizeToSquare(file, size) : file;
      const ext = useResize ? "png" : (file.name.split(".").pop() ?? "png");
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: useResize ? "image/png" : file.type,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e: any) {
      setError(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={className}>
      {label && <label className="block text-xs font-bold mb-2 text-muted-foreground">{label}</label>}
      <div className="flex items-center gap-3">
        {value && (
          <img
            src={value}
            alt=""
            className="w-16 h-16 rounded-lg object-cover border border-border shrink-0"
          />
        )}
        <label className="flex-1 cursor-pointer">
          <div className="px-4 py-2 border border-dashed border-border rounded-lg text-sm text-center hover:border-brand hover:bg-brand/5 transition">
            {uploading
              ? "جاري الرفع... / Uploading…"
              : value
              ? "استبدال الصورة / Replace"
              : "اختر صورة / Choose image"}
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {size > 0 && (
        <p className="text-[11px] text-muted-foreground mt-1.5">
          هيتم قص وتحويل الصورة تلقائيًا إلى مقاس {size}×{size} بكسل مربع.
        </p>
      )}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
