-- Verificação de e-mail
alter table usuarios add column if not exists email_verificado boolean not null default false;

-- Sessões ativas (permite listar e encerrar de outros dispositivos)
create table if not exists sessoes (
  id serial primary key,
  usuario_id integer references usuarios(id) on delete cascade,
  ip text,
  user_agent text,
  criado_em timestamp default now(),
  ultimo_uso timestamp default now(),
  revogada boolean not null default false
);
create index if not exists idx_sessoes_usuario on sessoes(usuario_id);

-- Tokens de verificação de e-mail e de confirmação de exclusão de conta
create table if not exists tokens_verificacao (
  id serial primary key,
  usuario_id integer references usuarios(id) on delete cascade,
  tipo text not null, -- 'email' ou 'exclusao'
  token_hash text not null,
  novo_email text, -- usado quando é troca de e-mail
  expira_em timestamp not null,
  usado boolean not null default false,
  criado_em timestamp default now()
);
create index if not exists idx_tokens_verificacao_hash on tokens_verificacao(token_hash);

-- Log de atividades da conta
create table if not exists log_atividades (
  id serial primary key,
  usuario_id integer references usuarios(id) on delete cascade,
  tipo text not null,
  detalhe text,
  ip text,
  criado_em timestamp default now()
);
create index if not exists idx_log_usuario on log_atividades(usuario_id);
