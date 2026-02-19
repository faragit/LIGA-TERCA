"use client";
import * as React from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { fmtBRL, safeKD } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Papa from "papaparse";

type Season = { id: string; nome: string; dt_inicio: string; dt_fim: string };
type Profile = { id: string; nick: string; elo: number };
type Mix = { id: string; season_id: string; dt_mix: string; valor_por_jogador: number };
type MP = { mix_id: string; player_id: string; payment_status: string; paid_value: number };
type Stat = { mix_id: string; player_id: string; kills: number; deaths: number };

export default function Dashboard() {
  const [seasons, setSeasons] = React.useState<Season[]>([]);
  const [seasonId, setSeasonId] = React.useState<string>("");
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [mixes, setMixes] = React.useState<Mix[]>([]);
  const [mixPlayers, setMixPlayers] = React.useState<MP[]>([]);
  const [stats, setStats] = React.useState<Stat[]>([]);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function load() {
    setMsg(null);
    const s = await supabase.from("seasons").select("id,nome,dt_inicio,dt_fim").order("dt_inicio", { ascending: false });
    setSeasons((s.data as any) ?? []);
    const p = await supabase.from("profiles").select("id,nick,elo").order("elo", { ascending: false });
    setProfiles((p.data as any) ?? []);
  }

  React.useEffect(() => { load(); }, []);

  React.useEffect(() => {
    if (!seasonId && seasons[0]?.id) setSeasonId(seasons[0].id);
  }, [seasons, seasonId]);

  React.useEffect(() => {
    if (!seasonId) return;
    (async () => {
      const m = await supabase.from("mixes").select("id,season_id,dt_mix,valor_por_jogador").eq("season_id", seasonId);
      const mixRows = ((m.data as any) ?? []) as Mix[];
      setMixes(mixRows);

      if (mixRows.length === 0) {
        setMixPlayers([]);
        setStats([]);
        return;
      }

      const mixIds = mixRows.map(x => x.id);

      const mp = await supabase.from("mix_players").select("*").in("mix_id", mixIds);
      setMixPlayers((mp.data as any) ?? []);

      // stats agregadas por mix/jogador (somando mapas)
      const st = await supabase
        .from("mix_player_map_stats")
        .select("mix_id,player_id,kills,deaths")
        .in("mix_id", mixIds);

      setStats((st.data as any) ?? []);
    })();
  }, [seasonId]);

  const totalMix = mixes.length;
  const totalJogadores = new Set(mixPlayers.map(x => x.player_id)).size;
  const totalArrecadado = mixPlayers.reduce((acc, x) => acc + (x.payment_status==="pago" ? (x.paid_value || 0) : 0), 0);
  const taxaPagamento = mixPlayers.length ? Math.round((mixPlayers.filter(x=>x.payment_status==="pago").length / mixPlayers.length)*100) : 0;

  // ranking
  const ranking = React.useMemo(() => {
    const byPlayer = new Map<string, { player_id: string; mixes: Set<string>; paid: number; pending: number; kills: number; deaths: number }>();
    const mixValue = new Map(mixes.map(m => [m.id, Number(m.valor_por_jogador)]));

    for (const mp of mixPlayers) {
      const rec = byPlayer.get(mp.player_id) ?? { player_id: mp.player_id, mixes: new Set(), paid: 0, pending: 0, kills: 0, deaths: 0 };
      rec.mixes.add(mp.mix_id);
      const v = mixValue.get(mp.mix_id) ?? 0;
      if (mp.payment_status === "pago") rec.paid += (mp.paid_value || v);
      else rec.pending += v;
      byPlayer.set(mp.player_id, rec);
    }

    for (const st of stats) {
      const rec = byPlayer.get(st.player_id) ?? { player_id: st.player_id, mixes: new Set(), paid: 0, pending: 0, kills: 0, deaths: 0 };
      rec.kills += st.kills ?? 0;
      rec.deaths += st.deaths ?? 0;
      byPlayer.set(st.player_id, rec);
    }

    const rows = Array.from(byPlayer.values()).map(r => {
      const prof = profiles.find(p => p.id === r.player_id);
      const kd = safeKD(r.kills, r.deaths);
      const pontos = (r.kills - r.deaths*0.6) + (kd*10);
      return {
        player_id: r.player_id,
        jogador: prof?.nick ?? "?",
        elo: prof?.elo ?? 1000,
        mix: r.mixes.size,
        paid: r.paid,
        pending: r.pending,
        kills: r.kills,
        deaths: r.deaths,
        kd: Number(kd.toFixed(2)),
        pontos: Number(pontos.toFixed(2)),
      };
    });

    rows.sort((a,b) => b.pontos - a.pontos || b.elo - a.elo || b.kd - a.kd);
    return rows;
  }, [mixPlayers, stats, mixes, profiles]);

  // gráfico K/D por mix (top 1 jogador do ranking)
  const [focusPlayer, setFocusPlayer] = React.useState<string>("");
  React.useEffect(() => {
    if (!focusPlayer && ranking[0]?.player_id) setFocusPlayer(ranking[0].player_id);
  }, [ranking, focusPlayer]);

  const kdSeries = React.useMemo(() => {
    if (!focusPlayer) return [];
    const mixById = new Map(mixes.map(m => [m.id, m]));
    const byMix = new Map<string, { kills: number; deaths: number }>();

    for (const st of stats.filter(s => s.player_id === focusPlayer)) {
      const rec = byMix.get(st.mix_id) ?? { kills: 0, deaths: 0 };
      rec.kills += st.kills ?? 0;
      rec.deaths += st.deaths ?? 0;
      byMix.set(st.mix_id, rec);
    }

    const rows = Array.from(byMix.entries()).map(([mix_id, v]) => {
      const m = mixById.get(mix_id);
      const kd = safeKD(v.kills, v.deaths);
      return {
        mix: m ? new Date(m.dt_mix).toLocaleDateString("pt-BR") : mix_id,
        kd: Number(kd.toFixed(2)),
      };
    });

    // ordena por data (usa dt_mix)
    rows.sort((a,b) => {
      const da = mixes.find(m => new Date(m.dt_mix).toLocaleDateString("pt-BR") === a.mix)?.dt_mix ?? "";
      const db = mixes.find(m => new Date(m.dt_mix).toLocaleDateString("pt-BR") === b.mix)?.dt_mix ?? "";
      return da.localeCompare(db);
    });

    return rows;
  }, [focusPlayer, mixes, stats]);

  function exportRankingCSV() {
    const csv = Papa.unparse(ranking);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ranking_temporada_${seasonId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-5xl font-extrabold text-neonCyan neon-cyan tracking-widest">DASHBOARD</div>
          <div className="text-slate-200/70 mt-1">Ranking, ELO, evolução de K/D e export</div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={seasonId}
            onChange={(e)=>setSeasonId(e.target.value)}
            className="rounded-2xl bg-panel/70 border border-neonCyan/25 px-4 py-3 outline-none focus:border-neonCyan/45"
          >
            {seasons.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
          <Button variant="ghost" onClick={exportRankingCSV}>Exportar CSV</Button>
        </div>
      </div>

      {msg ? <div className="text-sm text-red-200/80">{msg}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="text-slate-200/70 text-xs">Total Jogadores</div>
          <div className="text-3xl font-bold text-neonCyan neon-cyan">{totalJogadores}</div>
        </Card>
        <Card className="p-5">
          <div className="text-slate-200/70 text-xs">Total Mix</div>
          <div className="text-3xl font-bold text-neonPink neon-title">{totalMix}</div>
        </Card>
        <Card className="p-5">
          <div className="text-slate-200/70 text-xs">Total Arrecadado</div>
          <div className="text-3xl font-bold text-green-300">{fmtBRL(totalArrecadado)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-slate-200/70 text-xs">Taxa Pagamento</div>
          <div className="text-3xl font-bold text-yellow-300">{taxaPagamento}%</div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <div className="text-2xl font-extrabold tracking-widest text-neonPink neon-title">DESEMPENHO DOS JOGADORES</div>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="text-slate-200/70">
              <tr className="border-b border-white/10">
                <th className="py-2 text-left">#</th>
                <th className="py-2 text-left">Jogador</th>
                <th className="py-2 text-left">Mix</th>
                <th className="py-2 text-left">Pago</th>
                <th className="py-2 text-left">Pendente</th>
                <th className="py-2 text-left">Kills</th>
                <th className="py-2 text-left">Deaths</th>
                <th className="py-2 text-left">K/D</th>
                <th className="py-2 text-left">ELO</th>
                <th className="py-2 text-left">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, idx) => (
                <tr key={r.player_id} className="border-b border-white/5 hover:bg-white/5 cursor-pointer" onClick={() => setFocusPlayer(r.player_id)}>
                  <td className="py-3">{idx+1}</td>
                  <td className="py-3 font-bold text-slate-100">{r.jogador}</td>
                  <td className="py-3">{r.mix}</td>
                  <td className="py-3 text-green-300">{fmtBRL(r.paid)}</td>
                  <td className="py-3 text-red-300">{fmtBRL(r.pending)}</td>
                  <td className="py-3 text-green-300">{r.kills}</td>
                  <td className="py-3 text-red-300">{r.deaths}</td>
                  <td className="py-3 font-bold text-neonPink">{r.kd.toFixed(2)}</td>
                  <td className="py-3 text-neonCyan">{r.elo}</td>
                  <td className="py-3 text-slate-200/90">{r.pontos.toFixed(2)}</td>
                </tr>
              ))}
              {ranking.length === 0 ? <tr><td colSpan={10} className="py-6 text-slate-200/65">Sem dados nesta temporada.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-bold text-neonCyan neon-cyan">Evolução K/D</div>
            <div className="text-sm text-slate-200/65">Clique em um jogador na tabela pra focar</div>
          </div>
          <div className="text-sm text-slate-200/70">
            Foco: <span className="text-slate-100 font-bold">{profiles.find(p=>p.id===focusPlayer)?.nick ?? "-"}</span>
          </div>
        </div>

        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={kdSeries}>
              <XAxis dataKey="mix" tick={{ fill: "rgba(226,232,240,.7)" }} />
              <YAxis tick={{ fill: "rgba(226,232,240,.7)" }} domain={[0, "dataMax"]} />
              <Tooltip contentStyle={{ background: "rgba(11,16,35,.92)", border: "1px solid rgba(34,211,238,.2)", borderRadius: 12 }} />
              <Line type="monotone" dataKey="kd" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
