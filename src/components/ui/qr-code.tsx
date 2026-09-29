// ============================================================================
// ReguFlow - QR code (SVG, dihasilkan lokal)
// ----------------------------------------------------------------------------
// Modul QR diambil dari paket `qrcode` (MIT) lewat `buildQrGrid`, lalu digambar
// sebagai SVG path. Tidak ada script/gambar dari CDN sehingga tetap aman dengan
// CSP `script-src 'self'` dan tetap tajam di semua ukuran layar (vektor).
// ============================================================================

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { buildQrGrid, qrGridToSvgPath } from "@/lib/utils/qr";

export interface QrCodeProps {
  /** Teks/URL yang di-encode menjadi QR. */
  value: string;
  /** Lebar tampilan dalam piksel (SVG tetap tajam saat diperbesar). */
  size?: number;
  /** Quiet zone (ruang kosong) dalam jumlah modul. */
  quietZone?: number;
  darkColor?: string;
  lightColor?: string;
  /** Label untuk pembaca layar. */
  ariaLabel?: string;
  className?: string;
}

export function QrCode({
  value,
  size = 176,
  quietZone = 2,
  darkColor = "#0f172a",
  lightColor = "#ffffff",
  ariaLabel = "QR code",
  className,
}: QrCodeProps) {
  const model = useMemo(() => {
    const grid = buildQrGrid(value);
    if (!grid) return null;
    return { path: qrGridToSvgPath(grid.modules), count: grid.moduleCount };
  }, [value]);

  if (!model) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn(
          "flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-xs text-slate-500",
          className
        )}
      >
        QR tidak bisa dibuat. Gunakan nominal lain atau buka tautannya langsung.
      </div>
    );
  }

  const pad = Math.max(0, quietZone);
  const extent = model.count + pad * 2;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`${-pad} ${-pad} ${extent} ${extent}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={ariaLabel}
      className={cn("block", className)}
    >
      <title>{ariaLabel}</title>
      <rect x={-pad} y={-pad} width={extent} height={extent} fill={lightColor} />
      <path d={model.path} fill={darkColor} />
    </svg>
  );
}

export default QrCode;
