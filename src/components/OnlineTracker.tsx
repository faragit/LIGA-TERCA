"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/supabase";
import { joinOnlinePresence } from "@/lib/onlinePresence";

export default function OnlineTracker() {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!mounted || !user) return;

      // pega nick do profile (ajusta campo se seu profile usar outro nome)
      const { data: prof } = await supabase
        .from("profiles")
        .select("nick")
        .eq("id", user.id)
        .single();

      const nick = prof?.nick ?? "SemNick";

      channelRef.current = joinOnlinePresence(user.id, nick);
    })();

    return () => {
      mounted = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  return null;
}
