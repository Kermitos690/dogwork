import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";

interface LogoUploaderProps {
  /** Current image URL (signed or public). Empty/null = none. */
  value?: string | null;
  /** Called with the new public URL once uploaded, or null when removed. */
  onChange: (url: string | null) => void;
  /** Visual variant: square logo (refuge / cabinet) or circular avatar (personne). */
  shape?: "square" | "circle";
  /** Folder under user_id/ where to store the file. */
  folder?: string;
  /** UI label shown above the dropzone. */
  label?: string;
  /** Helper text shown under the dropzone. */
  helper?: string;
  /** Max upload size in MB (default 4). */
  maxSizeMB?: number;
}

const BUCKET = "brand-assets";

export function LogoUploader({
  value,
  onChange,
  shape = "square",
  folder = "logo",
  label = "Logo",
  helper = "PNG, JPG ou WebP — 4 Mo maximum. Format carré recommandé.",
  maxSizeMB = 4,
}: LogoUploaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = async (file: File) => {
    if (!user) {
      toast({ title: "Non connecté", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Format invalide", description: "Choisissez un fichier image.", variant: "destructive" });
      return;
    }
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({ title: "Fichier trop volumineux", description: `Maximum ${maxSizeMB} Mo.`, variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const safeExt = ["png", "jpg", "jpeg", "webp", "svg"].includes(ext) ? ext : "png";
      const path = `${user.id}/${folder}-${Date.now()}.${safeExt}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(`${pub.publicUrl}?t=${Date.now()}`);

      // Best-effort cleanup of any previous file in the same folder
      try {
        const { data: list } = await supabase.storage.from(BUCKET).list(`${user.id}`, { limit: 100 });
        const toRemove = (list || [])
          .filter((f) => f.name.startsWith(`${folder}-`) && !path.endsWith(f.name))
          .map((f) => `${user.id}/${f.name}`);
        if (toRemove.length > 0) {
          await supabase.storage.from(BUCKET).remove(toRemove);
        }
      } catch { /* non-blocking */ }

      toast({ title: "✅ Image téléversée" });
    } catch (e: any) {
      toast({ title: "Erreur upload", description: e.message || "Échec", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    try {
      const { data: list } = await supabase.storage.from(BUCKET).list(`${user.id}`, { limit: 100 });
      const toRemove = (list || [])
        .filter((f) => f.name.startsWith(`${folder}-`))
        .map((f) => `${user.id}/${f.name}`);
      if (toRemove.length > 0) await supabase.storage.from(BUCKET).remove(toRemove);
    } catch { /* non-blocking */ }
    onChange(null);
    toast({ title: "Image supprimée" });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const previewClass =
    shape === "circle"
      ? "w-20 h-20 rounded-full"
      : "w-20 h-20 rounded-xl";

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={`flex items-center gap-4 p-3 rounded-xl border-2 border-dashed transition-colors ${
          dragActive ? "border-primary bg-primary/5" : "border-border bg-muted/20"
        }`}
      >
        {/* Preview */}
        <div className={`${previewClass} shrink-0 overflow-hidden bg-muted flex items-center justify-center border border-border/60`}>
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-7 h-7 text-muted-foreground/50" />
          )}
        </div>

        {/* Actions */}
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed">{helper}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="gap-1.5"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {value ? "Remplacer" : "Téléverser"}
            </Button>
            {value && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleRemove}
                disabled={uploading}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <X className="w-3.5 h-3.5" /> Retirer
              </Button>
            )}
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
