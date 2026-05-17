import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Download, Printer, QrCode } from "lucide-react";
import { SpaceStatusBadge } from "./SpaceBadges";
import { getSpaceTypeLabel } from "@/lib/shelterSpaces";
import type { ShelterSpace } from "@/types/shelterSpaces";

interface Props {
  space: ShelterSpace;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpaceQRDialog({ space, open, onOpenChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>("");
  const url = `${window.location.origin}/shelter/spaces/${space.id}`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((d) => {
        if (cancelled) return;
        setDataUrl(d);
        if (canvasRef.current) {
          QRCode.toCanvas(canvasRef.current, url, {
            width: 256,
            margin: 2,
            errorCorrectionLevel: "M",
            color: { dark: "#0f172a", light: "#ffffff" },
          }).catch(() => {});
        }
      })
      .catch((e) => toast.error("Erreur génération QR : " + e.message));
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié");
    } catch {
      toast.error("Copie impossible");
    }
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-espace-${space.slug ?? space.id}.png`;
    a.click();
    toast.success("QR téléchargé");
  };

  const handlePrint = () => {
    if (!dataUrl) return;
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) {
      toast.error("Popup bloquée par le navigateur");
      return;
    }
    w.document.write(`<!doctype html><html><head><title>QR ${space.name}</title>
      <style>
        body{font-family:-apple-system,system-ui,sans-serif;padding:40px;text-align:center;color:#0f172a}
        h1{font-size:22px;margin:0 0 4px}
        p{margin:4px 0;color:#64748b;font-size:13px}
        img{margin:24px auto;display:block;max-width:320px;width:100%;border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#fff}
        .url{font-family:monospace;font-size:11px;word-break:break-all;color:#475569;margin-top:16px}
      </style></head><body>
      <h1>${escapeHtml(space.name)}</h1>
      <p>${escapeHtml(getSpaceTypeLabel(space.space_type))}${space.building ? " · " + escapeHtml(space.building) : ""}${space.floor ? " · Étage " + escapeHtml(space.floor) : ""}</p>
      <img src="${dataUrl}" alt="QR code" />
      <p>Scannez pour ouvrir la fiche espace</p>
      <p class="url">${escapeHtml(url)}</p>
      <script>window.onload=()=>{setTimeout(()=>window.print(),200)}</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-4 w-4" /> QR code · {space.name}
          </DialogTitle>
          <DialogDescription>
            Scannez ce QR pour ouvrir la fiche espace. L'accès reste protégé par les droits du compte.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
            <canvas ref={canvasRef} aria-label={`QR code de l'espace ${space.name}`} />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium">{getSpaceTypeLabel(space.space_type)}</p>
            <div className="flex justify-center"><SpaceStatusBadge value={space.status} /></div>
            <p className="text-[10px] font-mono text-muted-foreground break-all px-4">{url}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" /> Copier
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={!dataUrl} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> PNG
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!dataUrl} className="gap-1.5">
            <Printer className="h-3.5 w-3.5" /> Imprimer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function escapeHtml(s: string | null | undefined): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}
