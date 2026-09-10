-- Segurança: tentativas de login, tokens de redefinição e rate limiting

-- Controle de tentativas de login por conta
alter table usuarios add column if not exists tentativas_login integer not null default 0;
alter table usuarios add column if not exists bloqueado_ate timestamp;

-- Tokens de redefinição de senha (guardamos só o hash do token, nunca o token em si)
create table if not exists tokens_reset (
  id serial primary key,
  usuario_id integer references usuarios(id) on delete cascade,
  token_hash text not null,
  expira_em timestamp not null,
  usado boolean not null default false,
  criado_em timestamp default now()
);
create index if not exists idx_tokens_reset_hash on tokens_reset(token_hash);

-- Rate limiting genérico por chave (ip+rota). Janela deslizante simples.
create table if not exists rate_limits (
  chave text primary key,
  contador integer not null default 0,
  janela_inicio timestamp not null default now()
);
