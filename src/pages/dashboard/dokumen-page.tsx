import { useMemo, useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_TONES,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
} from "@/lib/constants";
import { useDocumentVault } from "@/hooks/use-document-vault";
import { useToast } from "@/components/ui/toast";
import {
  formatBytes,
  formatDateID,
  getSafeErrorMessage,
  relativeDateLabel,
  daysUntil,
  debounce,
} from "@/lib/utils";
import type { DocumentRow, DocumentStatus } from "@/types";

export default function DokumenPage() {
  const toast = useToast();
  const {
    documents,
    uploadDocument,
    createSignedUrl,
    updateDocumentStatus,
    deleteDocument,
  } = useDocumentVault();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    documentType: "",
    title: "",
    issueDate: "",
    expiryDate: "",
    notes: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<DocumentRow | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      if (typeFilter && doc.document_type !== typeFilter) return false;
      if (statusFilter && doc.verification_status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          doc.title.toLowerCase().includes(q) ||
          doc.file_name.toLowerCase().includes(q) ||
          (doc.document_type ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [documents, search, typeFilter, statusFilter]);

  const handleFileSelected = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setPendingFile(file);
    setUploadForm((prev) => ({
      ...prev,
      title: file.name.replace(/\.[^.]+$/, ""),
    }));
  };

  const handleUpload = async () => {
    if (!pendingFile) {
      toast.error("Belum ada file", "Pilih file yang ingin diupload.");
      return;
    }
    if (!uploadForm.documentType) {
      toast.error("Jenis dokumen wajib", "Pilih jenis dokumen dulu.");
      return;
    }
    try {
      await uploadDocument.mutateAsync({
        file: pendingFile,
        documentType: uploadForm.documentType,
        title: uploadForm.title || pendingFile.name,
        issueDate: uploadForm.issueDate || null,
        expiryDate: uploadForm.expiryDate || null,
        notes: uploadForm.notes || null,
      });
      toast.success("Dokumen terupload", `${uploadForm.title} berhasil disimpan.`);
      setUploadOpen(false);
      setPendingFile(null);
      setUploadForm({
        documentType: "",
        title: "",
        issueDate: "",
        expiryDate: "",
        notes: "",
      });
    } catch (error) {
      toast.error("Gagal upload", getSafeErrorMessage(error));
    }
  };

  const handlePreview = async (doc: DocumentRow) => {
    setDownloading(doc.id);
    try {
      const url = await createSignedUrl.mutateAsync({ doc, action: "preview" });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error("Gagal membuka dokumen", getSafeErrorMessage(error));
    } finally {
      setDownloading(null);
    }
  };

  const handleDownload = async (doc: DocumentRow) => {
    setDownloading(doc.id);
    try {
      const url = await createSignedUrl.mutateAsync({ doc, action: "download" });
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      toast.error("Gagal mendownload", getSafeErrorMessage(error));
    } finally {
      setDownloading(null);
    }
  };

  const handleStatusChange = async (doc: DocumentRow, status: DocumentStatus) => {
    try {
      await updateDocumentStatus.mutateAsync({ docId: doc.id, status });
      toast.success("Status diperbarui", DOCUMENT_STATUS_LABELS[status]);
    } catch (error) {
      toast.error("Gagal memperbarui status", getSafeErrorMessage(error));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDocument.mutateAsync(deleteTarget);
      toast.success("Dokumen dihapus", deleteTarget.title);
      setDeleteTarget(null);
    } catch (error) {
      toast.error("Gagal menghapus", getSafeErrorMessage(error));
    }
  };

  const handleSearch = debounce((value: string) => setSearch(value), 300);

  const expiringSoon = documents.filter((d) => {
    const days = daysUntil(d.expiry_date);
    return days !== null && days <= 30;
  }).length;

  return (
    <div>
      <PageHeader
        title="Brankas Dokumen"
        description="Semua dokumen disimpan secara privat. Akses hanya melalui tautan aman (signed URL)."
        actions={
          <Button onClick={() => setUploadOpen(true)}>+ Upload Dokumen</Button>
        }
      />

      {expiringSoon > 0 && (
        <Card className="mb-5 border-amber-200 bg-amber-50/60">
          <CardBody>
            <p className="text-sm text-amber-800">
              <strong>{expiringSoon} dokumen</strong> akan kadaluarsa dalam 30 hari
              atau sudah kadaluarsa. Cek detailnya di bawah.
            </p>
          </CardBody>
        </Card>
      )}

      <Card className="mb-5">
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label htmlFor="doc-search" className="label-text">
              Cari dokumen
            </label>
            <Input
              id="doc-search"
              placeholder="Nama atau judul..."
              onChange={(e) => handleSearch(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="doc-type-filter" className="label-text">
              Jenis dokumen
            </label>
            <Select
              id="doc-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="mt-1.5"
            >
              <option value="">Semua jenis</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOCUMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="doc-status-filter" className="label-text">
              Status
            </label>
            <Select
              id="doc-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1.5"
            >
              <option value="">Semua status</option>
              {Object.entries(DOCUMENT_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      {documents.length === 0 ? (
        <Card>
          <EmptyState
            title="Brankas masih kosong"
            description="Upload dokumen pertama kamu — NIB, KTP, sertifikat halal, atau dokumen usaha lainnya."
            actionLabel="+ Upload Dokumen"
            onAction={() => setUploadOpen(true)}
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="Tidak ada dokumen yang cocok"
            description="Coba ubah kata kunci atau filter pencarian."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onPreview={handlePreview}
              onDownload={handleDownload}
              onStatusChange={handleStatusChange}
              onDelete={() => setDeleteTarget(doc)}
              busy={downloading === doc.id}
            />
          ))}
        </div>
      )}

      {/* Upload modal */}
      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload Dokumen"
        description="File divalidasi otomatis. Maksimal 10MB. Format: PDF, JPG, PNG, WebP, DOC, XLS."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleUpload}
              loading={uploadDocument.isPending}
              disabled={!pendingFile || !uploadForm.documentType}
            >
              Upload Sekarang
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FileUpload
            onFilesSelected={handleFileSelected}
            onError={(msg) => toast.error("File tidak valid", msg)}
          />

          {pendingFile && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">{pendingFile.name}</p>
              <p className="mt-0.5 text-slate-500">
                {formatBytes(pendingFile.size)} · {pendingFile.type || "tipe tidak diketahui"}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="doc-type" className="label-text">
                Jenis dokumen <span className="text-red-500">*</span>
              </label>
              <Select
                id="doc-type"
                value={uploadForm.documentType}
                onChange={(e) =>
                  setUploadForm((p) => ({ ...p, documentType: e.target.value }))
                }
                className="mt-1.5"
              >
                <option value="">Pilih jenis dokumen</option>
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DOCUMENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="doc-title" className="label-text">
                Judul dokumen
              </label>
              <Input
                id="doc-title"
                value={uploadForm.title}
                onChange={(e) =>
                  setUploadForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Contoh: NIB Kue Bu Tina"
                className="mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="doc-issue" className="label-text">
                Tanggal terbit
              </label>
              <Input
                id="doc-issue"
                type="date"
                value={uploadForm.issueDate}
                onChange={(e) =>
                  setUploadForm((p) => ({ ...p, issueDate: e.target.value }))
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="doc-expiry" className="label-text">
                Tanggal kadaluarsa
              </label>
              <Input
                id="doc-expiry"
                type="date"
                value={uploadForm.expiryDate}
                onChange={(e) =>
                  setUploadForm((p) => ({ ...p, expiryDate: e.target.value }))
                }
                className="mt-1.5"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Dokumen kamu disimpan di storage <strong>private</strong> dan hanya
            bisa diakses melalui tautan aman. Setiap akses tercatat di audit log.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus dokumen?"
        message={`"${deleteTarget?.title}" akan dihapus permanen dari brankas. Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Ya, hapus"
        danger
        loading={deleteDocument.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DocumentCard({
  doc,
  onPreview,
  onDownload,
  onStatusChange,
  onDelete,
  busy,
}: {
  doc: DocumentRow;
  onPreview: (doc: DocumentRow) => void;
  onDownload: (doc: DocumentRow) => void;
  onStatusChange: (doc: DocumentRow, status: DocumentStatus) => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const days = daysUntil(doc.expiry_date);
  const isExpired = days !== null && days < 0;
  const isExpiringSoon = days !== null && days >= 0 && days <= 30;

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge tone="gray" className="mb-1.5">
              {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
            </Badge>
            <h3 className="text-sm font-semibold text-slate-900 break-words">
              {doc.title}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              {doc.file_name} · {formatBytes(doc.file_size)}
            </p>
          </div>
          <button
            type="button"
            onClick={onDelete}
            className="flex-shrink-0 text-slate-400 hover:text-red-600"
            aria-label="Hapus dokumen"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {isExpired ? (
            <Badge tone="red">Kadaluarsa {relativeDateLabel(doc.expiry_date)}</Badge>
          ) : isExpiringSoon ? (
            <Badge tone="amber">
              Expired {relativeDateLabel(doc.expiry_date)}
            </Badge>
          ) : null}
          <Badge className={DOCUMENT_STATUS_TONES[doc.verification_status]}>
            {DOCUMENT_STATUS_LABELS[doc.verification_status]}
          </Badge>
        </div>

        {doc.expiry_date && (
          <p className="text-xs text-slate-500">
            Kadaluarsa: {formatDateID(doc.expiry_date)}
          </p>
        )}

        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPreview(doc)}
            loading={busy}
            disabled={busy}
          >
            Preview
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDownload(doc)}
            disabled={busy}
          >
            Download
          </Button>
        </div>

        <div>
          <label
            htmlFor={`status-${doc.id}`}
            className="sr-only"
          >
            Update status dokumen
          </label>
          <Select
            id={`status-${doc.id}`}
            value={doc.verification_status}
            onChange={(e) =>
              onStatusChange(doc, e.target.value as DocumentStatus)
            }
            className="text-xs"
          >
            {Object.entries(DOCUMENT_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </CardBody>
    </Card>
  );
}
