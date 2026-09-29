// ============================================================================
// ReguFlow - Widget dukungan mengambang (Trakteer + sumber terbuka)
// ----------------------------------------------------------------------------
// Widget ini SENGAJA tidak memakai script/iframe resmi Trakteer: CSP aplikasi
// membatasi `script-src 'self'` sehingga skrip pihak ketiga diblokir. Gantinya:
//   - nominal traktiran dipilih di dalam aplikasi (tanpa pindah halaman),
//   - tautan Trakteer + nominal ditampilkan sebagai QR hasil generator lokal,
//   - tombol hanya membuka tab baru, jadi tidak ada navigasi yang mengganggu.
// ============================================================================

import { useCallback, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { QrCode } from "@/components/ui/qr-code";
import { useToast } from "@/components/ui/toast";
import {
  GIT_CLONE_COMMAND,
  OPEN_SOURCE_CREDIT,
  OPEN_SOURCE_LICENSE,
  REPO_URL,
  REPO_ZIP_URL,
  TRAKTEER_BASE_NOMINAL,
  TRAKTEER_MAX_NOMINAL,
  TRAKTEER_PROFILE_URL,
  TRAKTEER_QR_CAPTION,
  TRAKTEER_WIDGET_MESSAGE,
  normalizeTrakteerNominal,
  trakteerQuickNominals,
  trakteerTipUrl,
} from "@/lib/constants/trakteer";
import { cn, copyTextToClipboard, formatRupiah } from "@/lib/utils";

/** Widget disembunyikan per sesi saja, supaya muncul lagi di kunjungan berikut. */
const HIDE_SESSION_KEY = "reguflow.trakteer.hidden";

type Panel = "traktir" | "kode";

const iconPaths = {
  heart:
    "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z",
  external:
    "M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25",
  copy: "M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184",
  download:
    "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3",
  code: "M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5",
};

type IconName = keyof typeof iconPaths;

function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4 flex-shrink-0", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[name]} />
    </svg>
  );
}

/** Gaya tautan yang tampil seperti tombol agar konsisten dengan `Button`. */
const linkClasses = {
  accent:
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-700 active:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2",
  primary:
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 active:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
  outline:
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
};

function readHiddenForSession(): boolean {
  try {
    return sessionStorage.getItem(HIDE_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function TrakteerWidget() {
  const toast = useToast();
  const [visible, setVisible] = useState(() => !readHiddenForSession());
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("traktir");
  const [nominal, setNominal] = useState(TRAKTEER_BASE_NOMINAL * 2);

  const quickNominals = useMemo(() => trakteerQuickNominals(), []);
  const tipUrl = useMemo(() => trakteerTipUrl(nominal), [nominal]);

  const copy = useCallback(
    async (text: string, label: string) => {
      const ok = await copyTextToClipboard(text);
      if (ok) toast.success(`${label} disalin`);
      else toast.error("Gagal menyalin", "Silakan salin manual dari layar ini.");
    },
    [toast]
  );

  const hideWidget = useCallback(() => {
    try {
      sessionStorage.setItem(HIDE_SESSION_KEY, "1");
    } catch {
      // mode privat: abaikan, widget tetap bisa ditutup
    }
    setVisible(false);
    setOpen(false);
  }, []);

  if (!visible) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={`Dukungan & ${OPEN_SOURCE_CREDIT}`}
          className="fixed bottom-5 right-5 z-40 inline-flex animate-fade-in items-center gap-2 rounded-full bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-card-lg transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
        >
          <Icon name="heart" className="h-5 w-5" />
          <span>Traktir admin</span>
        </button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Traktir admin & sumber terbuka"
        description={TRAKTEER_WIDGET_MESSAGE}
        footer={
          <>
            <Button variant="ghost" onClick={hideWidget}>
              Sembunyikan
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Tutup
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div
            className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
            role="tablist"
            aria-label="Panel widget"
          >
            {(
              [
                ["traktir", "Traktir"],
                ["kode", "Source code"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={panel === value}
                onClick={() => setPanel(value)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  panel === value
                    ? "bg-white text-slate-900 shadow-card"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {panel === "traktir" ? (
            <TraktirPanel
              nominal={nominal}
              quickNominals={quickNominals}
              tipUrl={tipUrl}
              onNominal={setNominal}
              onCopy={copy}
            />
          ) : (
            <SourcePanel onCopy={copy} />
          )}

          <p className="border-t border-slate-100 pt-3 text-center text-xs text-slate-400">
            {OPEN_SOURCE_CREDIT} · {OPEN_SOURCE_LICENSE} ·{" "}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-600 hover:underline"
            >
              reguflow-1-kk
            </a>
          </p>
        </div>
      </Modal>
    </>
  );
}

interface TraktirPanelProps {
  nominal: number;
  quickNominals: number[];
  tipUrl: string;
  onNominal: (nominal: number) => void;
  onCopy: (text: string, label: string) => Promise<void> | void;
}

function TraktirPanel({
  nominal,
  quickNominals,
  tipUrl,
  onNominal,
  onCopy,
}: TraktirPanelProps) {
  const toast = useToast();
  const [custom, setCustom] = useState("");

  const applyCustom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = Number(custom.replace(/[^\d]/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.warning(
        "Nominal belum valid",
        `Masukkan angka, misalnya ${TRAKTEER_BASE_NOMINAL * 2}.`
      );
      return;
    }
    const next = normalizeTrakteerNominal(parsed);
    onNominal(next);
    setCustom("");
    if (next !== parsed) {
      toast.info(
        `Nominal disesuaikan ke ${formatRupiah(next)}`,
        `Harus kelipatan ${formatRupiah(TRAKTEER_BASE_NOMINAL)}, maksimal ${formatRupiah(TRAKTEER_MAX_NOMINAL)}.`
      );
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-700">Pilih nominal traktiran</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {quickNominals.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={nominal === value}
              onClick={() => onNominal(value)}
              className={cn(
                "rounded-xl border px-2 py-2.5 text-sm font-semibold transition-colors",
                nominal === value
                  ? "border-rose-500 bg-rose-50 text-rose-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {formatRupiah(value)}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={applyCustom} className="flex items-end gap-2">
        <label className="min-w-0 flex-1 text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Nominal lain (kelipatan {formatRupiah(TRAKTEER_BASE_NOMINAL)})
          </span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder={`${TRAKTEER_BASE_NOMINAL * 10}`}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </label>
        <Button type="submit" variant="outline">
          Pakai
        </Button>
      </form>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">
          {formatRupiah(nominal)} via Trakteer
        </p>
        <QrCode
          value={tipUrl}
          size={184}
          ariaLabel={`QR Trakteer untuk traktiran ${formatRupiah(nominal)}`}
          className="rounded-lg shadow-card"
        />
        <p className="text-center text-xs text-slate-500">{TRAKTEER_QR_CAPTION}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <a
          href={tipUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClasses.accent}
        >
          Buka Trakteer
          <Icon name="external" />
        </a>
        <Button variant="outline" onClick={() => void onCopy(tipUrl, "Tautan traktiran")}>
          <Icon name="copy" />
          Salin tautan
        </Button>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Trakteer tidak menyediakan pembayaran otomatis di dalam aplikasi, jadi tombol dan QR
        ini membuka halaman resmi {TRAKTEER_PROFILE_URL} — nominal akhir dikonfirmasi di
        sana. Tidak ada data akun ReguFlow yang dikirim.
      </p>
    </div>
  );
}

interface SourcePanelProps {
  onCopy: (text: string, label: string) => Promise<void> | void;
}

function SourcePanel({ onCopy }: SourcePanelProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Source code ReguFlow</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Frontend (Vite + React) dan backend (Express + Neon) dirilis publik dengan{" "}
          {OPEN_SOURCE_LICENSE}. Silakan pelajari, pakai ulang, atau kirim pull request.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <a
            href={REPO_ZIP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClasses.primary}
          >
            Download ZIP
            <Icon name="download" />
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClasses.outline}
          >
            Buka repositori
            <Icon name="external" />
          </a>
        </div>
      </div>

      <div className="space-y-2">
        <CodeRow label="git clone" code={GIT_CLONE_COMMAND} onCopy={onCopy} />
        <CodeRow label="URL repositori" code={REPO_URL} onCopy={onCopy} />
      </div>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:gap-4">
        <QrCode
          value={REPO_ZIP_URL}
          size={132}
          ariaLabel="QR unduhan ZIP source code ReguFlow"
          className="rounded-lg bg-white p-1 shadow-card"
        />
        <p className="text-center text-xs leading-relaxed text-slate-500 sm:text-left">
          Pindai QR ini dengan kamera HP untuk langsung membuka arsip ZIP source code di
          browser HP.
        </p>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Dipakai bebas tanpa biaya dan tanpa iklan. Atribut:{" "}
        <span className="font-medium text-slate-700">{OPEN_SOURCE_CREDIT}</span>.
      </p>
    </div>
  );
}

function CodeRow({
  label,
  code,
  onCopy,
}: {
  label: string;
  code: string;
  onCopy: (text: string, label: string) => Promise<void> | void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5">
      <span className="sr-only">{label}</span>
      <Icon name="code" className="h-4 w-4 text-slate-400" />
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700" title={code}>
        {code}
      </code>
      <button
        type="button"
        onClick={() => void onCopy(code, label)}
        aria-label={`Salin ${label}`}
        className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Icon name="copy" />
      </button>
    </div>
  );
}

export default TrakteerWidget;



