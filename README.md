# Liga da Terça (CS2)

Projeto pronto (tema neon Mocha) com:
- Login/Signup (Supabase Auth)
- Temporadas → Mix
- Mix: seleção de mapas, jogadores, pagamento, K/D por mapa, export CSV
- Dashboard: ranking por temporada, gráfico de evolução K/D, export CSV
- ELO: atualizado ao finalizar mix (baseado em times A/B + performance K/D)

## Configuração (mínima)
1) Crie um projeto no Supabase e cole `supabase/schema.sql` no SQL Editor (run).
2) Em Settings → API, copie `URL` e `anon key` e preencha `.env` (use `.env.example`).
3) Publique no Vercel (importando o repositório) e adicione as mesmas env vars.

> Se quiser admin-only, me fala que eu já travo tudo por role.
