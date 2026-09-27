import { useEffect } from "react";
import { AppRouter } from "@/app/router";
import { Toaster } from "@/components/ui/toast";
import { useAuthStore } from "@/lib/supabase/auth-store";

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  );
}
