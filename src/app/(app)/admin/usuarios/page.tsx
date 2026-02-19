
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOnlineList } from "@/lib/onlinePresence";

export default function AdminUsuariosPage() {
  const [channel, setChannel] = useState<any>(null);
  const [online, setOnline] = useState<any[]>([]);
  const [mixes, setMixes] = useState<any[]>([]);
  const [selectedMix, setSelectedMix] = useState<string>("");

  // Carrega mixes
  useEffect(() => {
    async function loadMixes() {
      const { data } = await supabase
        .from("mixes")
        .select("id, dt_mix, status")
        .order("dt_mix", { ascending: false });

      setMixes(data || []);
      if (data?.length) setSelectedMix(data[0].id);
    }

    loadMixes();
  }, []);

  // Presence online
  useEffect(() => {
    const ch = supabase.channel("online");

    ch.on("presence", { event: "sync" }, () => {
      const list = getOnlineList(ch);
      setOnline(list);
    });

    ch.subscribe();

    setChannel(ch);

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  async function inscrever(userId: string) {
    if (!selectedMix) return alert("Selecione um mix");

    const { error } = await supabase.from("mix_players").insert({
      mix_id: selectedMix,
      player_id: userId, // se der erro aqui, me manda print das colunas
      team: "A",
      captain: false,
      paid: false,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Usuário inscrito no mix!");
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">
        Admin • Usuários Online
      </h1>

      <div className="mb-6">
        <label className="text-slate-300 mr-3">Mix:</label>
        <select
          value={selectedMix}
          onChange={(e) => setSelectedMix(e.target.value)}
          className="bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-white"
        >
          {mixes.map((m) => (
            <option key={m.id} value={m.id}>
              {new Date(m.dt_mix).toLocaleString("pt-BR")} • {m.status}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {online.length === 0 && (
          <div className="text-slate-400">Nenhum usuário online.</div>
        )}

        {online.map((u) => (
          <div
            key={u.userId}
            className="flex items-center justify-between bg-black/30 border border-white/10 rounded-xl px-4 py-3"
          >
            <div>
              <div className="text-white font-medium">{u.nick}</div>
              <div className="text-slate-500 text-xs">{u.userId}</div>
            </div>

            <button
              onClick={() => inscrever(u.userId)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
            >
              Inscrever no Mix
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
