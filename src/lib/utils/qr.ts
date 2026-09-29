// ============================================================================
// ReguFlow - Helper QR code
// ----------------------------------------------------------------------------
// QR dibuat 100% lokal memakai paket `qrcode` (MIT) yang ikut ter-bundle,
// sehingga aman untuk CSP `script-src 'self'` (tanpa script/image CDN).
// ============================================================================

import { create } from "qrcode";

export interface QrGrid {
  /** Jumlah modul per sisi (mis. 33 = QR versi 4). */
  moduleCount: number;
  /** Grid baris x kolom. `true` = modul gelap. */
  modules: boolean[][];
}

/**
 * Bangun grid modul QR dari teks/URL. `null` bila teks tidak bisa di-encode
 * (mis. terlalu panjang untuk versi maksimal).
 */
export function buildQrGrid(value: string): QrGrid | null {
  try {
    const qr = create(value, { errorCorrectionLevel: "M" });
    const moduleCount = qr.modules.size;
    const modules: boolean[][] = [];

    for (let row = 0; row < moduleCount; row++) {
      const line: boolean[] = [];
      for (let col = 0; col < moduleCount; col++) {
        line.push(Boolean(qr.modules.get(row, col)));
      }
      modules.push(line);
    }

    return { moduleCount, modules };
  } catch {
    return null;
  }
}

/**
 * Ubah grid menjadi satu SVG path: tiap modul gelap digambar sebagai kotak 1x1
 * pada koordinat (x = kolom, y = baris).
 */
export function qrGridToSvgPath(modules: boolean[][]): string {
  let path = "";
  for (let row = 0; row < modules.length; row++) {
    const line = modules[row];
    if (!line) continue;
    for (let col = 0; col < line.length; col++) {
      if (line[col]) path += `M${col} ${row}h1v1h-1z`;
    }
  }
  return path;
}
