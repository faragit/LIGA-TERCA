import { Card } from "@/components/Card";

export default function AppHome() {
  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-8 border border-neonCyan/15">
        <div className="text-5xl font-extrabold tracking-widest text-neonPink neon-title">LIGA DA TERÇA</div>
        <div className="mt-3 text-neonCyan/80 neon-cyan">Gerencie temporadas, mix, K/D, ELO e ranking.</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="text-neonCyan neon-cyan font-bold">Temporadas</div>
          <div className="text-slate-200/70 text-sm mt-1">Crie temporadas e organize os mix</div>
        </Card>
        <Card className="p-6">
          <div className="text-neonPink neon-title font-bold">Mix</div>
          <div className="text-slate-200/70 text-sm mt-1">Mapas, jogadores, pagamentos e stats</div>
        </Card>
        <Card className="p-6">
          <div className="text-green-300 font-bold">Dashboard</div>
          <div className="text-slate-200/70 text-sm mt-1">Ranking, ELO, gráficos e export CSV</div>
        </Card>
      </div>
    </div>
  );
}
