-- Execute este script no PostgreSQL do servidor para criar as tabelas

create table if not exists usuarios (
  id serial primary key,
  email text unique not null,
  senha_hash text not null,
  status_assinatura text not null default 'inativa', -- inativa | ativa | cancelada
  assinatura_expira_em timestamp,
  mp_preapproval_id text,
  criado_em timestamp default now()
);

create table if not exists leads (
  id serial primary key,
  usuario_id integer references usuarios(id) on delete cascade,
  nome text,
  endereco text,
  telefone text,
  avaliacao numeric,
  nicho text,
  localidade text,
  contatado boolean default false,
  criado_em timestamp default now()
);

create index if not exists idx_leads_usuario on leads(usuario_id);
