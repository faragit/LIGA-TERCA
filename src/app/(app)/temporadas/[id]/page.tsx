"use client";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import type { Mix, Season } from "@/lib/types";
import Link from "next/link";

export default function TemporadaDetalhe() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const seasonId = params.id;

  const [season, setSeason] = React.useState<Season | null>(null);
  const [mixes, setMixes] = React.useState<Mix[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [dtMix, setDtMix] = React.useState("");
  const [valor, setValor] = React.useState("10");
  const [msg, setMsg] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);

    const s = await supabase.from("seasons").select("*").eq("id", seasonId).single();
    if (s.error) setMsg(s.error.message);
    setSeason((s.data as any) ?? null);

    const m = await supabase.from("mixes").select("*").eq("season_id", seasonId).order("dt_mix", { ascending: false });
    if (m.error) setMsg(m.error.message);
    setMixes((m.data as any) ?? []);
    setLoading(false);
  }

  React.useEffect(() => { load(); }, [seasonId]);

  async function createMix() {
    setMsg(null);
    const { data, error } = await supabase.from("mixes").insert({
      season_id: seasonId,
      dt_mix: new Date(dtMix).toISOString(),
      valor_por_jogador: Number(valor),
      status: "agendado",
    }).select("*").single();
    if (error) return setMsg(error.message);

    // cria registros de mapas default (vazio) — usuário escolhe depois na tela do mix
    router.push(`mix/${data!.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-4xl font-extrabold text-neonPink neon-title tracking-widest">{season?.nome ?? "..."}</div>
          <div className="text-slate-200/65">{season ? `${new Date(season.dt_inicio).toLocaleDateString("pt-BR")} - ${new Date(season.dt_fim).toLocaleDateString("pt-BR")}` : ""}</div>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>← voltar</Button>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-3 md:items-end justify-between">
          <div>
            <div className="text-xs text-slate-200/70 mb-1">Data do mix</div>
            <input value={dtMix} onChange={(e)=>setDtMix(e.target.value)} type="datetime-local" className="rounded-2xl bg-panel/70 border border-neonCyan/25 px-4 py-3 outline-none focus:border-neonCyan/45" />
          </div>
          <div>
            <div className="text-xs text-slate-200/70 mb-1">R$ / jogador</div>
            <input value={valor} onChange={(e)=>setValor(e.target.value)} type="number" min="0" step="1" className="rounded-2xl bg-panel/70 border border-neonCyan/25 px-4 py-3 outline-none focus:border-neonCyan/45 w-40" />
          </div>
          <Button onClick={createMix} disabled={!dtMix}>+ Novo Mix</Button>
        </div>
        {msg ? <div className="mt-3 text-sm text-red-200/80">{msg}</div> : null}
      </Card>

      <div className="space-y-3">
        {loading ? <div className="text-slate-200/70">carregando…</div> : null}
        {mixes.map((m) => (
          <Card key={m.id} className="p-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-bold text-neonCyan neon-cyan">
                {new Date(m.dt_mix).toLocaleString("pt-BR")}
                <span className="ml-3 text-xs px-2 py-1 rounded-lg border border-neonCyan/20 text-slate-200/70">
                  {m.status.toUpperCase()}
                </span>
              </div>
              <div className="text-slate-200/65 text-sm">R$ {Number(m.valor_por_jogador).toFixed(0)} / jogador</div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/mix/${m.id}`} className="rounded-xl px-4 py-2 border border-neonCyan/25 hover:bg-white/5">
                Abrir  ›
              </Link>
            </div>
          </Card>
        ))}
        {!loading && mixes.length === 0 ? (
          <div className="text-slate-200/65">Nenhum mix criado nesta temporada.</div>
        ) : null}
      </div>
    </div>
  );
}
