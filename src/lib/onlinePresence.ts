"use client";

import { supabase } from "@/lib/supabase";

export function joinOnlinePresence(userId: string, nick: string) {
  const channel = supabase.channel("online", {
    config: { presence: { key: userId } },
  });

  channel.on("presence", { event: "sync" }, () => {
    // sync acontece sempre que alguém entra/sai
  });

  channel.subscribe(async (status) => {
    if (status !== "SUBSCRIBED") return;
    await channel.track({ userId, nick, at: new Date().toISOString() });
  });

  return channel;
}

export function getOnlineList(channel: any) {
  const state = channel.presenceState() as Record<string, any[]>;
  return Object.entries(state).map(([userId, metas]) => ({
    userId,
    nick: metas?.[0]?.nick ?? "—",
    at: metas?.[0]?.at ?? null,
  }));
}
