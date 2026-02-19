"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const NavItem = ({ href, label }: { href: string; label: string }) => {
  const p = usePathname();
  const active = p === href;
  return (
    <Link
      href={href}
      className={cn(
        "rounded-xl px-4 py-2 text-sm border transition",
        active
          ? "bg-neonCyan/10 border-neonCyan/35 text-neonCyan shadow-neon"
          : "border-transparent text-slate-200/90 hover:bg-white/5 hover:border-neonCyan/15"
      )}
    >
      {label}
    </Link>
  );
};

export function Navbar() {
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="sticky top-0 z-40 border-b border-white/5 bg-bg1/70 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-neonPink neon-title font-extrabold tracking-widest">
          LIGA DA TERÇA
        </Link>

        <div className="flex items-center gap-2">
          <NavItem href="/" label="Início" />
          <NavItem href="/temporadas" label="Temporadas" />
          <NavItem href="/dashboard" label="Dashboard" />
          <button onClick={logout} className="ml-2 text-xs text-slate-300/70 hover:text-slate-200">
            sair
          </button>
        </div>
      </div>
    </div>
  );
}
