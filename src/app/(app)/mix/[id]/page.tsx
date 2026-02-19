"use client";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { clamp, fmtBRL, safeKD } from "@/lib/utils";
import Papa from "papaparse";

type MixRow = {
  id: string;
  season_id: string;
  dt_mix: string;
  valor_por_jogador: number;
  status: string;
};

type MapRow = { id: string; nome: string };
type ProfileRow = { id: string; nick: string; nome: string; elo: number };

type MixPlayerRow = { mix_id: string; player_id: string; payment_status: "pendente" | "pago"; paid_value: number };
type StatRow = { mix_id: string; player_id: string; map_id: string; kills: number; deaths: number; assists: number; mvps: number };

export default function MixPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const mixId = params.id;

  const [mix, setMix] = React.useState<MixRow | null>(null);
  const [allMaps, setAllMaps] = React.useState<MapRow[]>([]);
  const [mixMaps, setMixMaps] = React.useState<MapRow[]>([]);
  const [players, setPlayers] = React.useState<ProfileRow[]>([]);
  const [mixPlayers, setMixPlayers] = React.useState<MixPlayerRow[]>([]);
  const [stats, setStats] = React.useState<StatRow[]>([]);
  const [msg, setMsg] = React.useState<string | null>(null);

  const [openPlayers, setOpenPlayers] = React.useState(false);
  const [openKD, setOpenKD] = React.useState(false);

  const [playerSearch, setPlayerSearch] = React.useState("");
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string | null>(null);

  async function load() {
    setMsg(null);
    const m = await supabase.from("mixes").select("*").eq("id", mixId).single();
    if (m.error) setMsg(m.error.message);
    setMix((m.data as any) ?? null);

    const maps = await supabase.from("maps").select("*").order("nome");
    setAllMaps((maps.data as any) ?? []);

    const mm = await supabase
      .from("mix_maps")
      .select("maps(id,nome)")
      .eq("mix_id", mixId)
      .order("ordem", { ascending: true });
    setMixMaps(((mm.data ?? []) as any).map((x: any) => x.maps));

    const ps = await supabase.from("profiles").select("id,nick,nome,elo").order("nick");
    setPlayers((ps.data as any) ?? []);

    const mp = await supabase.from("mix_players").select("*").eq("mix_id", mixId);
    setMixPlayers((mp.data as any) ?? []);

    const st = await supabase.from("mix_player_map_stats").select("*").eq("mix_id", mixId);
    setStats((st.data as any) ?? []);
  }

  React.useEffect(() => { load(); }, [mixId]);

  const totalJogadores = mixPlayers.length;
  const totalPago = mixPlayers.reduce((acc, p) => acc + (p.payment_status === "pago" ? (p.paid_value || mix?.valor_por_jogador || 0) : 0), 0);
  const totalPendente = mixPlayers.reduce((acc, p) => acc + (p.payment_status !== "pago" ? (mix?.valor_por_jogador || 0) : 0), 0);

  function statFor(playerId: string, mapId: string): StatRow | undefined {
    return stats.find(s => s.player_id === playerId && s.map_id === mapId);
  }

  async function toggleMap(map: MapRow) {
    const exists = mixMaps.some(m => m.id === map.id);
    if (!exists) {
      const ordem = mixMaps.length + 1;
      const ins = await supabase.from("mix_maps").insert({ mix_id: mixId, map_id: map.id, ordem });
      if (ins.error) setMsg(ins.error.message);
    } else {
      const del = await supabase.from("mix_maps").delete().eq("mix_id", mixId).eq("map_id", map.id);
      if (del.error) setMsg(del.error.message);
    }
    load();
  }

  async function addPlayer(playerId: string) {
    const { error } = await supabase.from("mix_players").insert({
      mix_id: mixId,
      player_id: playerId,
      payment_status: "pendente",
      paid_value: 0,
    });
    if (error) setMsg(error.message);
    load();
  }

  async function removePlayer(playerId: string) {
    await supabase.from("mix_player_map_stats").delete().eq("mix_id", mixId).eq("player_id", playerId);
    const { error } = await supabase.from("mix_players").delete().eq("mix_id", mixId).eq("player_id", playerId);
    if (error) setMsg(error.message);
    load();
  }

  async function setPayment(playerId: string, status: "pendente" | "pago") {
    const value = status === "pago" ? (mix?.valor_por_jogador || 0) : 0;
    const { error } = await supabase.from("mix_players").update({ payment_status: status, paid_value: value }).eq("mix_id", mixId).eq("player_id", playerId);
    if (error) setMsg(error.message);
    load();
  }

  async function upsertStat(playerId: string, mapId: string, patch: Partial<StatRow>) {
    const current = statFor(playerId, mapId);
    const base = current ?? { mix_id: mixId, player_id: playerId, map_id: mapId, kills: 0, deaths: 0, assists: 0, mvps: 0 };
    const row = { ...base, ...patch };
    const { error } = await supabase.from("mix_player_map_stats").upsert(row, { onConflict: "mix_id,player_id,map_id" });
    if (error) setMsg(error.message);
    load();
  }

  // ELO: atualiza ao finalizar (por enquanto: 2 times A/B fixos por ordem de entrada)
  async function finalizeMix() {
    if (!mix) return;
    if (mixPlayers.length < 2) return setMsg("Adicione jogadores antes de finalizar.");
    if (mixMaps.length === 0) return setMsg("Selecione pelo menos 1 mapa.");

    // times: primeiros metade = A, resto = B (pra você usar rápido).
    // depois você pode ajustar na UI (fácil evoluir).
    const sorted = [...mixPlayers];
    const half = Math.ceil(sorted.length / 2);
    const teamA = sorted.slice(0, half).map(p => p.player_id);
    const teamB = sorted.slice(half).map(p => p.player_id);

    // se não tiver resultado, assume empate (você pode preencher depois)
    const results = await supabase.from("mix_map_results").select("*").eq("mix_id", mixId);
    const resRows = (results.data as any[]) ?? [];
    const mapsToCalc = mixMaps;

    // helper elo
    const playerMap = new Map(players.map(p => [p.id, p]));
    function avgElo(ids: string[]) {
      const elos = ids.map(id => playerMap.get(id)?.elo ?? 1000);
      return elos.reduce((a,b)=>a+b,0) / Math.max(1, elos.length);
    }
    function expected(me: number, opp: number) {
      return 1 / (1 + Math.pow(10, (opp - me) / 400));
    }

    const K = 24;

    // acumula deltas por jogador
    const delta = new Map<string, number>();
    for (const pid of [...teamA, ...teamB]) delta.set(pid, 0);

    for (const map of mapsToCalc) {
      const r = resRows.find(x => x.map_id === map.id);
      const winner = r?.winner ?? "draw"; // A|B|draw
      const SA = winner === "A" ? 1 : winner === "B" ? 0 : 0.5;
      const SB = 1 - SA;

      const eloA = avgElo(teamA);
      const eloB = avgElo(teamB);

      for (const pid of teamA) {
        const me = playerMap.get(pid)?.elo ?? 1000;
        const E = expected(me, eloB);
        let d = K * (SA - E);

        // peso por performance no mapa
        const stKills = (stats.find(s => s.player_id===pid && s.map_id===map.id)?.kills) ?? 0;
        const stDeaths = (stats.find(s => s.player_id===pid && s.map_id===map.id)?.deaths) ?? 0;
        const kd = safeKD(stKills, stDeaths);
        const perf = clamp(0.85, 1 + ((kd - 1) * 0.10), 1.15);
        d *= perf;

        delta.set(pid, (delta.get(pid) || 0) + d);
      }

      for (const pid of teamB) {
        const me = playerMap.get(pid)?.elo ?? 1000;
        const E = expected(me, eloA);
        let d = K * (SB - E);

        const stKills = (stats.find(s => s.player_id===pid && s.map_id===map.id)?.kills) ?? 0;
        const stDeaths = (stats.find(s => s.player_id===pid && s.map_id===map.id)?.deaths) ?? 0;
        const kd = safeKD(stKills, stDeaths);
        const perf = clamp(0.85, 1 + ((kd - 1) * 0.10), 1.15);
        d *= perf;

        delta.set(pid, (delta.get(pid) || 0) + d);
      }

      // grava times (pra histórico)
      for (const pid of teamA) {
        await supabase.from("mix_player_map_team").upsert({ mix_id: mixId, map_id: map.id, player_id: pid, team: "A" }, { onConflict: "mix_id,map_id,player_id" });
      }
      for (const pid of teamB) {
        await supabase.from("mix_player_map_team").upsert({ mix_id: mixId, map_id: map.id, player_id: pid, team: "B" }, { onConflict: "mix_id,map_id,player_id" });
      }
    }

    // aplica update elo no profile
    for (const [pid, d] of delta.entries()) {
      const curr = playerMap.get(pid)?.elo ?? 1000;
      const next = Math.round(curr + d);
      await supabase.from("profiles").update({ elo: next }).eq("id", pid);
    }

    await supabase.from("mixes").update({ status: "finalizado" }).eq("id", mixId);
    setMsg("Mix finalizado e ELO atualizado.");
    load();
  }

  function exportCSV() {
    const rows: any[] = [];
    for (const mp of mixPlayers) {
      const p = players.find(x => x.id === mp.player_id);
      const line: any = {
        jogador: p?.nick ?? mp.player_id,
        pagamento: mp.payment_status,
        pago: mp.paid_value,
      };
      for (const map of mixMaps) {
        const st = statFor(mp.player_id, map.id);
        line[`${map.nome}_kills`] = st?.kills ?? 0;
        line[`${map.nome}_deaths`] = st?.deaths ?? 0;
        line[`${map.nome}_kd`] = Number(safeKD(st?.kills ?? 0, st?.deaths ?? 0).toFixed(2));
      }
      rows.push(line);
    }
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mix_${mixId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredPlayers = players.filter(p => (p.nick || "").toLowerCase().includes(playerSearch.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-3xl font-extrabold text-neonPink neon-title tracking-widest">
            Mix {mix ? new Date(mix.dt_mix).toLocaleString("pt-BR") : ""}
          </div>
          <div className="text-slate-200/65">
            Status: <span className="text-neonCyan">{mix?.status?.toUpperCase() ?? "..."}</span> · Valor: {mix ? fmtBRL(Number(mix.valor_por_jogador)) : ""}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.back()}>← voltar</Button>
          <Button variant="ghost" onClick={exportCSV}>Exportar CSV</Button>
          <Button onClick={() => setOpenPlayers(true)}>Jogadores</Button>
          <Button variant="ghost" onClick={() => setOpenKD(true)}>K/D</Button>
          <Button onClick={finalizeMix} disabled={mix?.status === "finalizado"}>Finalizar + ELO</Button>
        </div>
      </div>

      {msg ? <div className="text-sm text-slate-200/80">{msg}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="text-slate-200/70 text-xs">Total Jogadores</div>
          <div className="text-3xl font-bold text-neonCyan neon-cyan">{totalJogadores}</div>
        </Card>
        <Card className="p-5">
          <div className="text-slate-200/70 text-xs">Total Arrecadado</div>
          <div className="text-3xl font-bold text-green-300">{fmtBRL(totalPago)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-slate-200/70 text-xs">Pendente</div>
          <div className="text-3xl font-bold text-red-300">{fmtBRL(totalPendente)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-slate-200/70 text-xs">Taxa Pagamento</div>
          <div className="text-3xl font-bold text-yellow-300">
            {totalJogadores ? Math.round((mixPlayers.filter(p=>p.payment_status==="pago").length / totalJogadores)*100) : 0}%
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="text-lg font-bold text-neonCyan neon-cyan mb-3">Mapas do Mix</div>
        <div className="flex flex-wrap gap-2">
          {allMaps.map(map => {
            const active = mixMaps.some(m => m.id === map.id);
            return (
              <button
                key={map.id}
                onClick={() => toggleMap(map)}
                className={
                  active
                    ? "px-3 py-2 rounded-xl bg-neonCyan/10 border border-neonCyan/35 text-neonCyan shadow-neon text-sm"
                    : "px-3 py-2 rounded-xl bg-white/0 border border-white/10 text-slate-200/80 hover:bg-white/5 text-sm"
                }
              >
                {map.nome}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <div className="text-2xl font-extrabold tracking-widest text-neonPink neon-title">DESEMPENHO DO MIX</div>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="text-slate-200/70">
              <tr className="border-b border-white/10">
                <th className="py-2 text-left">Jogador</th>
                <th className="py-2 text-left">Pagamento</th>
                {mixMaps.map(m => <th key={m.id} className="py-2 text-left">{m.nome}</th>)}
                <th className="py-2 text-left">K/D Mix</th>
                <th className="py-2 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {mixPlayers.map(mp => {
                const p = players.find(x => x.id === mp.player_id);
                const totals = mixMaps.reduce((acc, map) => {
                  const st = statFor(mp.player_id, map.id);
                  acc.k += st?.kills ?? 0;
                  acc.d += st?.deaths ?? 0;
                  return acc;
                }, { k: 0, d: 0 });
                const kdMix = safeKD(totals.k, totals.d);

                return (
                  <tr key={mp.player_id} className="border-b border-white/5">
                    <td className="py-3">
                      <div className="font-bold text-slate-100">{p?.nick ?? "?"}</div>
                      <div className="text-xs text-slate-200/60">ELO: {p?.elo ?? 1000}</div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPayment(mp.player_id, mp.payment_status === "pago" ? "pendente" : "pago")}
                          className={mp.payment_status==="pago"
                            ? "px-3 py-1 rounded-lg bg-green-500/15 border border-green-400/25 text-green-200"
                            : "px-3 py-1 rounded-lg bg-red-500/15 border border-red-400/25 text-red-200"}
                        >
                          {mp.payment_status === "pago" ? "Pago" : "Pendente"}
                        </button>
                      </div>
                    </td>
                    {mixMaps.map(map => {
                      const st = statFor(mp.player_id, map.id);
                      const kd = safeKD(st?.kills ?? 0, st?.deaths ?? 0);
                      return (
                        <td key={map.id} className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-green-300">{st?.kills ?? 0}</span>
                            <span className="text-slate-200/40">/</span>
                            <span className="text-red-300">{st?.deaths ?? 0}</span>
                            <span className="ml-2 text-xs text-slate-200/60">KD {kd.toFixed(2)}</span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-3 font-bold text-neonPink">{kdMix.toFixed(2)}</td>
                    <td className="py-3">
                      <Button variant="danger" onClick={() => removePlayer(mp.player_id)}>Excluir</Button>
                    </td>
                  </tr>
                );
              })}
              {mixPlayers.length === 0 ? (
                <tr><td className="py-6 text-slate-200/65" colSpan={5 + mixMaps.length}>Sem jogadores</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Jogadores */}
      <Modal open={openPlayers} onClose={() => setOpenPlayers(false)} title="JOGADORES DO MIX">
        <div className="flex gap-2">
          <input
            value={playerSearch}
            onChange={(e)=>setPlayerSearch(e.target.value)}
            placeholder="Buscar jogador"
            className="flex-1 rounded-2xl bg-panel/70 border border-neonCyan/25 px-4 py-3 outline-none focus:border-neonCyan/45"
          />
        </div>

        <div className="mt-4 max-h-[320px] overflow-auto space-y-2">
          {filteredPlayers.map(p => {
            const inMix = mixPlayers.some(x => x.player_id === p.id);
            return (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <div className="font-bold">{p.nick}</div>
                  <div className="text-xs text-slate-200/60">ELO {p.elo}</div>
                </div>
                {inMix ? (
                  <span className="text-xs text-slate-200/60">já no mix</span>
                ) : (
                  <Button onClick={() => addPlayer(p.id)}>+</Button>
                )}
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Modal K/D */}
      <Modal open={openKD} onClose={() => setOpenKD(false)} title="ESTATÍSTICAS K/D" className="max-w-4xl">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <select
            value={selectedPlayerId ?? ""}
            onChange={(e)=>setSelectedPlayerId(e.target.value || null)}
            className="rounded-2xl bg-panel/70 border border-neonCyan/25 px-4 py-3 outline-none focus:border-neonCyan/45"
          >
            <option value="">Selecione jogador</option>
            {mixPlayers.map(mp => {
              const p = players.find(x=>x.id===mp.player_id);
              return <option key={mp.player_id} value={mp.player_id}>{p?.nick ?? "?"}</option>;
            })}
          </select>
          <div className="text-slate-200/65 text-sm">
            Preencha kills/deaths por mapa. (assists e mvps estão prontos também)
          </div>
        </div>

        {!selectedPlayerId ? (
          <div className="mt-6 text-slate-200/65">Selecione um jogador.</div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-[700px] w-full text-sm">
              <thead className="text-slate-200/70">
                <tr className="border-b border-white/10">
                  <th className="py-2 text-left">Mapa</th>
                  <th className="py-2 text-left">Kills</th>
                  <th className="py-2 text-left">Deaths</th>
                  <th className="py-2 text-left">Assists</th>
                  <th className="py-2 text-left">MVPs</th>
                  <th className="py-2 text-left">K/D</th>
                </tr>
              </thead>
              <tbody>
                {mixMaps.map(map => {
                  const st = statFor(selectedPlayerId, map.id) ?? { kills: 0, deaths: 0, assists: 0, mvps: 0 } as any;
                  const kd = safeKD(st.kills, st.deaths);
                  return (
                    <tr key={map.id} className="border-b border-white/5">
                      <td className="py-3 font-bold text-neonCyan">{map.nome}</td>
                      <td className="py-3">
                        <input
                          type="number"
                          className="w-24 rounded-xl bg-bg1/60 border border-neonCyan/20 px-3 py-2"
                          value={st.kills}
                          onChange={(e)=>upsertStat(selectedPlayerId, map.id, { kills: Number(e.target.value) })}
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          className="w-24 rounded-xl bg-bg1/60 border border-neonCyan/20 px-3 py-2"
                          value={st.deaths}
                          onChange={(e)=>upsertStat(selectedPlayerId, map.id, { deaths: Number(e.target.value) })}
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          className="w-24 rounded-xl bg-bg1/60 border border-neonCyan/20 px-3 py-2"
                          value={st.assists}
                          onChange={(e)=>upsertStat(selectedPlayerId, map.id, { assists: Number(e.target.value) })}
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          className="w-24 rounded-xl bg-bg1/60 border border-neonCyan/20 px-3 py-2"
                          value={st.mvps}
                          onChange={(e)=>upsertStat(selectedPlayerId, map.id, { mvps: Number(e.target.value) })}
                        />
                      </td>
                      <td className="py-3 font-bold text-neonPink">{kd.toFixed(2)}</td>
                    </tr>
                  );
                })}
                {mixMaps.length === 0 ? (
                  <tr><td className="py-6 text-slate-200/65" colSpan={6}>Selecione mapas do mix primeiro.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
