// ============================================================================
// ReguFlow - Supabase client (browser)
// ----------------------------------------------------------------------------
// KEAMANAN:
// - Hanya menggunakan ANON key (public). TIDAK PERNAH service role key.
// - URL & anon key berasal dari environment variables (import.meta.env).
// - Anon key memang publik dan aman; akses data tetap dibatasi oleh RLS.
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Aplikasi tetap bisa dirender (mis. landing page statis), tapi fitur auth &
  // data tidak akan jalan. Pesan sengaja generik agar tidak membocorkan detail.
  // eslint-disable-next-line no-console
  console.warn(
    "ReguFlow: Konfigurasi Supabase belum lengkap. Set VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env (lihat .env.example)."
  );
}

export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-anon-key",
  {
    auth: {
      // Gunakan storage browser default (localStorage). Token disimpan Supabase
      // SDK; tidak ada token tambahan yang kita simpan manual.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        // Identifikasi aplikasi - tidak mengandung secret.
        "x-client-info": "reguflow-web/0.1.0",
      },
    },
  }
);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Nama bucket storage dokumen (PRIVATE - lihat supabase/migrations/0003_storage.sql)
export const DOCUMENTS_BUCKET = "documents";
