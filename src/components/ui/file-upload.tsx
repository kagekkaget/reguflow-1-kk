import { useCallback, useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils";
import {
  MAX_FILE_SIZE_BYTES,
  validateUploadedFile,
} from "@/lib/security";

export interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSizeBytes?: number;
  onFilesSelected: (files: File[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

const DEFAULT_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx";

export function FileUpload({
  accept = DEFAULT_ACCEPT,
  multiple = false,
  maxSizeBytes = MAX_FILE_SIZE_BYTES,
  onFilesSelected,
  onError,
  disabled = false,
  className,
  label = "Tarik file ke sini atau klik untuk pilih",
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList);
      const valid: File[] = [];

      for (const file of files) {
        if (file.size > maxSizeBytes) {
          onError("Ukuran file maksimal 10MB.");
          continue;
        }
        const result = validateUploadedFile(file);
        if (!result.ok) {
          onError(result.error ?? "Jenis file tidak didukung.");
          continue;
        }
        valid.push(file);
      }

      if (valid.length > 0) {
        onFilesSelected(multiple ? valid : [valid[0]!]);
      }
    },
    [maxSizeBytes, multiple, onError, onFilesSelected]
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
        isDragging
          ? "border-brand-500 bg-brand-50"
          : "border-slate-300 bg-slate-50/50 hover:border-brand-400 hover:bg-brand-50/40",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          // reset agar file sama bisa dipilih ulang
          e.target.value = "";
        }}
      />
      <svg
        className="h-10 w-10 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
        />
      </svg>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="text-xs text-slate-500">
        PDF, JPG, PNG, WebP, DOC, XLS — maksimal {formatBytes(maxSizeBytes)}
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="mt-1 inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed"
      >
        Pilih File
      </button>
    </div>
  );
}
