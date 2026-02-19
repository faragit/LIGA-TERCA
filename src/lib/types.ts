export type Season = {
  id: string;
  nome: string;
  dt_inicio: string;
  dt_fim: string;
  is_active: boolean;
};

export type Mix = {
  id: string;
  season_id: string;
  dt_mix: string;
  valor_por_jogador: number;
  status: "agendado" | "finalizado" | "cancelado";
};

export type Profile = {
  id: string;
  nick: string;
  nome: string;
  role: "admin" | "jogador";
  elo: number;
};
