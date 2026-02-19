"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = React.useState<"login" | "signup">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [nick, setNick] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/temporadas");
    });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/temporadas");
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // cria profile
        const userId = data.user?.id;
        if (userId) {
          const { error: upErr } = await supabase.from("profiles").insert({
            id: userId,
            nick: nick || email.split("@")[0],
            nome: nick || email.split("@")[0],
            role: "jogador",
          });
          // se já existir por qualquer motivo, ignora
          if (upErr && !String(upErr.message).toLowerCase().includes("duplicate")) {
            // não quebra o fluxo
            console.warn(upErr);
          }
        }
        setMsg("Conta criada. Se precisar confirmar email, verifica sua caixa.");
        router.push("/temporadas");
      }
    } catch (err: any) {
      setMsg(err?.message ?? "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-4xl">
        <div className="mx-auto w-full max-w-2xl glass rounded-3xl p-8 border border-neonCyan/20 shadow-neon">
          <h1 className="text-center text-5xl font-extrabold tracking-widest text-neonPink neon-title">
            LIGA DA<br/>TERÇA
          </h1>
          <p className="text-center mt-4 text-neonCyan/85 neon-cyan tracking-wide">
            Counter-Strike 2 Performance Management
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={mode==="login" ? "px-4 py-2 rounded-xl bg-white/5 border border-neonCyan/25 text-neonCyan shadow-neon" : "px-4 py-2 rounded-xl text-slate-200/80 hover:bg-white/5 border border-transparent"}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={mode==="signup" ? "px-4 py-2 rounded-xl bg-white/5 border border-neonCyan/25 text-neonCyan shadow-neon" : "px-4 py-2 rounded-xl text-slate-200/80 hover:bg-white/5 border border-transparent"}
              >
                Criar conta
              </button>
            </div>

            <div className="grid gap-3">
              {mode === "signup" ? (
                <input
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  placeholder="Nick do jogador"
                  className="w-full rounded-2xl bg-panel/70 border border-neonCyan/25 px-4 py-3 outline-none focus:border-neonCyan/45"
                />
              ) : null}

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                required
                className="w-full rounded-2xl bg-panel/70 border border-neonCyan/25 px-4 py-3 outline-none focus:border-neonCyan/45"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                type="password"
                required
                className="w-full rounded-2xl bg-panel/70 border border-neonCyan/25 px-4 py-3 outline-none focus:border-neonCyan/45"
              />
            </div>

            <div className="pt-2 flex justify-center">
              <Button type="submit" disabled={loading} className="w-full max-w-md py-4 text-base">
                {loading ? "..." : mode === "login" ? "ENTRAR  ›" : "CRIAR CONTA  ›"}
              </Button>
            </div>

            {msg ? <p className="text-center text-sm text-slate-200/75">{msg}</p> : null}
          </form>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5">
            <div className="text-neonCyan neon-cyan font-bold">Temporadas</div>
            <div className="text-slate-200/70 text-sm mt-1">Organize os mix por temporada</div>
          </Card>
          <Card className="p-5">
            <div className="text-neonPink neon-title font-bold">Jogadores</div>
            <div className="text-slate-200/70 text-sm mt-1">Cadastre participantes e acompanhe</div>
          </Card>
          <Card className="p-5">
            <div className="text-green-300 font-bold">Pagamentos</div>
            <div className="text-slate-200/70 text-sm mt-1">Controle financeiro do mix</div>
          </Card>
        </div>
      </div>
    </main>
  );
}
