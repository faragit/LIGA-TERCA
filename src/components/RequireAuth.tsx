"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) router.replace("/");
      else setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/");
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  if (!ready) return <div className="p-8 text-slate-200/70">carregando…</div>;
  return <>{children}</>;
}
