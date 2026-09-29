import { lazy, Suspense, useEffect } from "react";
import { AppRouter } from "@/app/router";
import { Toaster } from "@/components/ui/toast";
import { useAuthStore } from "@/lib/api/auth-store";

// Widget dukungan dimuat terpisah (code-splitting) supaya tidak menambah
// ukuran bundle awal aplikasi.
const TrakteerWidget = lazy(() => import("@/components/common/trakteer-widget"));

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <>
      <AppRouter />
      <Toaster />
      <Suspense fallback={null}>
        <TrakteerWidget />
      </Suspense>
    </>
  );
}
