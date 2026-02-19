"use client";
import * as React from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import type { Season } from "@/lib/types";

export default function Temporadas() {
  const [items, setItems] = React.useState<Season[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [nome, setNome] = React.useState("");
  const [dtInicio, setDtInicio] = React.useState("");
  const [dtFim, setDtFim] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("seasons")
      .select("*")
      .order("dt_inicio", { ascending: false });
    if (error) setMsg(error.message);
    setItems((data ?? []) as any);
    setLoading(false);
  }

  React.useEffect(() => {
    load();
  }, []);

  async function createSeason() {
    setMsg(null);
    const { error } = await supabase.from("seasons").insert({
      nome,
      dt_inicio: dtInicio,
      dt_fim: dtFim,
      is_active: true,
    });
    if (error) return setMsg(error.message);
    setNome("");
    setDtInicio("");
    setDtFim("");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-5xl font-extrabold text-neonCyan neon-cyan tracking-widest">TEMPORADAS</div>
          <div className="text-slate-200/70 mt-1">Gerencie as temporadas da liga</div>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <div className="text-xs text-slate-200/70 mb-1">Nome</div>
            <input value={nome} onChange={(e)=>setNome(e.target.value)} className="w-full rounded-2xl bg-panel/70 border border-neonCyan/25 px-4 py-3 outline-none focus:border-neonCyan/45" placeholder="ex: Season 1" />
          </div>
          <div>
            <div className="text-xs text-slate-200/70 mb-1">Início</div>
            <input value={dtInicio} onChange={(e)=>setDtInicio(e.target.value)} type="date" className="rounded-2xl bg-panel/70 border border-neonCyan/25 px-4 py-3 outline-none focus:border-neonCyan/45" />
          </div>
          <div>
            <div className="text-xs text-slate-200/70 mb-1">Fim</div>
            <input value={dtFim} onChange={(e)=>setDtFim(e.target.value)} type="date" className="rounded-2xl bg-panel/70 border border-neonCyan/25 px-4 py-3 outline-none focus:border-neonCyan/45" />
          </div>
          <Button onClick={createSeason} disabled={!nome || !dtInicio || !dtFim}>+ Nova Temporada</Button>
        </div>
        {msg ? <div className="mt-3 text-sm text-red-200/80">{msg}</div> : null}
      </Card>

      <div className="space-y-3">
        {loading ? <div className="text-slate-200/70">carregando…</div> : null}
        {items.map((s) => (
          <Card key={s.id} className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 rounded-full border border-neonCyan/40" />
              <div>
                <div className="text-xl font-bold text-neonPink neon-title">{s.nome}</div>
                <div className="text-slate-200/65 text-sm">{new Date(s.dt_inicio).toLocaleDateString("pt-BR")} - {new Date(s.dt_fim).toLocaleDateString("pt-BR")}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`temporadas/${s.id}`} className="rounded-xl px-4 py-2 border border-neonCyan/25 hover:bg-white/5">
                Ver Mix  ›
              </Link>
            </div>
          </Card>
        ))}
        {!loading && items.length === 0 ? (
          <div className="text-slate-200/65">Nenhuma temporada criada.</div>
        ) : null}
      </div>
    </div>
  );
}
