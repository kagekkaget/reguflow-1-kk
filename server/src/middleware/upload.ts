// ============================================================================
// ReguFlow - Upload middleware (multer, in-memory + disk storage)
// ----------------------------------------------------------------------------
// File divalidasi (tipe/ukuran/nama) sebelum disimpan ke UPLOAD_DIR (private).
// Path relatif disimpan ke DB; file TIDAK di-serve statis.
// ============================================================================

import multer from "multer";
import type { NextFunction, Response } from "express";
import { promises as fs } from "node:fs";
import { dirname, extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { validateUploadedFile } from "../lib/security";
import type { AuthenticatedRequest } from "./auth";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./storage/documents";
const MAX_UPLOAD_BYTES = Number(
  process.env.MAX_UPLOAD_BYTES ?? 10 * 1024 * 1024
);

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  /** Path relatif terhadap UPLOAD_DIR (disimpan ke DB). */
  relativePath: string;
}

export interface UploadRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
  uploadedFile?: UploadedFile;
}

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    } catch (err) {
      cb(err as Error, UPLOAD_DIR);
    }
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

const multerUpload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    const check = validateUploadedFile({
      buffer: Buffer.alloc(0),
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    });
    if (!check.ok) {
      cb(new Error(check.error));
      return;
    }
    cb(null, true);
  },
});

/**
 * Middleware upload satu file dengan field name `file`.
 * Hasilnya tersedia di `req.uploadedFile` (relativePath untuk DB).
 */
export function uploadSingle(fieldName = "file") {
  return [
    multerUpload.single(fieldName),
    (req: UploadRequest, _res: Response, next: NextFunction) => {
      if (!req.file) {
        next(new Error("File tidak ditemukan pada request."));
        return;
      }
      const absPath = req.file.path;
      const relativePath = absPath
        .replace(UPLOAD_DIR, "")
        .replace(/^[\\/]+/, "")
        .replaceAll("\\", "/");
      req.uploadedFile = {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        encoding: req.file.encoding,
        mimetype: req.file.mimetype,
        size: req.file.size,
        relativePath,
      };
      next();
    },
  ];
}

/** Baca file dari storage (untuk download/preview oleh pemilik yang sah). */
export async function readUploadedFile(relativePath: string): Promise<Buffer> {
  const absPath = join(UPLOAD_DIR, relativePath);
  // Cegah path traversal: pastikan resolved path tetap di dalam UPLOAD_DIR.
  const resolved = await fs.realpath(absPath);
  const root = await fs.realpath(UPLOAD_DIR);
  if (!resolved.startsWith(root)) {
    throw new Error("Akses file tidak diizinkan.");
  }
  return fs.readFile(resolved);
}

/** Hapus file dari storage. */
export async function deleteUploadedFile(relativePath: string): Promise<void> {
  const absPath = join(UPLOAD_DIR, relativePath);
  try {
    const resolved = await fs.realpath(absPath);
    const root = await fs.realpath(UPLOAD_DIR);
    if (!resolved.startsWith(root)) return;
    await fs.unlink(resolved);
  } catch {
    // File sudah tidak ada — ignore.
  }
}

export { UPLOAD_DIR, MAX_UPLOAD_BYTES, dirname };
