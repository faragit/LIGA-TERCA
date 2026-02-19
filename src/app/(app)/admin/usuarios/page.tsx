"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/supabase";
import { getOnlineList } from "@/lib/onlinePresence";

type Mix = { id: string; dt_mix: string; status: string };
type Profile = { id: string; nick: string; role?: string };

export default function AdminUsuariosPage() {
  const [channel, setChannel] = useState<any>(null);
  const [online, setOnline] = useState<{ userId: string; nick: string; at: string | null }[]>([]);
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [mixId, setMixId] = useState<string>("");

  // 1) pega mixes (abertos)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mixes")
        .select("id, dt_mix, status")
        .in("status", ["AGENDADO", "ABERTO"])
        .order("dt_mix", { ascending: false });

      setMixes((data ?? []) as any);
      if (!mixId && data?.[0]?.id) setMixId(data[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) lista users (pra buscar nick caso presence falhe)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, nick, role")
        .order("nick", { ascending: true });

      setProfiles((data ?? []) as any);
    })();
  }, []);

  // 3) entra no canal online e sincroniza lista
  useEffect(() => {
    const ch = supabase.channel("online", { config: { presence: { key: "admin" } } });

    const sync = () => {
      const list = getOnlineList(ch);
      setOnline(list);
    };

    ch.on("presence", { event: "sync" }, sync);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") sync();
    });

    setChannel(ch);

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const onlineSorted = useMemo(() => {
    return [...online].sort((a, b) => (a.nick || "").localeCompare(b.nick || ""));
  }, [online]);

  async function inscrever(userId: string, team: "A" | "B") {
    if (!mixId) return alert("Selecione um mix.");

    // ⚠️ AJUSTE AQUI se a coluna não for player_id
    const payload: any = { mix_id: mixId, player_id: userId, team, captain: false, paid: false };

    const { error } = await supabase.from("mix_players").insert(payload);
    if (error) return alert(error.message);

    alert("Inscrito!");
  }

  async function setCaptain(team: "A" | "B", userId: string) {
    if (!mixId) return alert("Selecione um mix.");

    // zera capitão do time
    await supabase
      .from("mix_players")
      .update({ captain: false })
      .eq("mix_id", mixId)
      .eq("team", team);

    // seta capitão do user
    const { error } = await supabase
      .from("mix_players")
      .update({ captain: true })
      .eq("mix_id", mixId)
      // ⚠️ AJUSTE AQUI se a coluna não for player_id
      .eq("player_id", userId);

    if (error) return alert(error.message);
    alert(`Capitão ${team} definido!`);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-100">Admin • Usuários Online</h1>
        <Link href="/dashboard" className="text-slate-300 hover:text-white">Voltar</Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="text-slate-300 text-sm">Mix:</label>
        <select
          value={mixId}
          onChange={(e) => setMixId(e.target.value)}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-slate-100"
        >
          {mixes.map((m) => (
            <option key={m.id} value={m.id}>
              {new Date(m.dt_mix).toLocaleString("pt-BR")} • {m.status}
            </option>
          ))}
        </select>

        <a
          href={mixId ? `/mix/${mixId}` : "#"}
          className="rounded-lg px-3 py-2 border border-white/10 text-slate-200 hover:bg-white/5"
        >
          Abrir Mix
        </a>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-slate-200 font-semibold mb-3">Online agora ({onlineSorted.length})</div>

          {onlineSorted.length === 0 ? (
            <div className="text-slate-400 text-sm">Ninguém online.</div>
          ) : (
            <div className="space-y-2">
              {onlineSorted.map((u) => (
                <div key={u.userId} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <div>
                    <div className="text-slate-100 font-medium">{u.nick}</div>
                    <div className="text-slate-400 text-xs">{u.userId}</div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => inscrever(u.userId, "A")}
                      className="rounded-lg px-3 py-1.5 text-sm border border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/10"
                    >
                      + Time A
                    </button>
                    <button
                      onClick={() => inscrever(u.userId, "B")}
                      className="rounded-lg px-3 py-1.5 text-sm border border-sky-400/30 text-sky-200 hover:bg-sky-500/10"
                    >
                      + Time B
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-slate-200 font-semibold mb-3">Definir Capitães (precisa já estar inscrito)</div>

          <div className="text-slate-400 text-sm mb-3">
            Clique em “Capitão A/B” em um usuário online que já foi inscrito no mix.
          </div>

          <div className="space-y-2">
            {onlineSorted.map((u) => (
              <div key={u.userId} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <div className="text-slate-100">{u.nick}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCaptain("A", u.userId)}
                    className="rounded-lg px-3 py-1.5 text-sm border border-fuchsia-400/30 text-fuchsia-200 hover:bg-fuchsia-500/10"
                  >
                    Capitão A
                  </button>
                  <button
                    onClick={() => setCaptain("B", u.userId)}
                    className="rounded-lg px-3 py-1.5 text-sm border border-violet-400/30 text-violet-200 hover:bg-violet-500/10"
                  >
                    Capitão B
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Se der erro, é quase certo que o nome da coluna não é <b>player_id</b>. (me manda print das colunas do mix_players)
          </div>
        </div>
      </div>
    </div>
  );
}
