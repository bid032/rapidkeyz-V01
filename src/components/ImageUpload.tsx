import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  bucket: string;
  value?: string | null;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
};

export function ImageUpload({ bucket, value, onChange, label, className }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
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
            {uploading ? "..." : value ? "استبدال الصورة / Replace" : "اختر صورة / Choose image"}
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
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
