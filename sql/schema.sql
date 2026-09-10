-- Execute este script no PostgreSQL do servidor para criar as tabelas do zero

create table if not exists usuarios (
  id serial primary key,
  email text unique not null,
  senha_hash text not null,
  bloqueado boolean not null default false,
  is_admin boolean not null default false,
  criado_em timestamp default now()
);

create table if not exists leads (
  id serial primary key,
  usuario_id integer references usuarios(id) on delete cascade,
  nome text,
  endereco text,
  telefone text,
  avaliacao numeric,
  total_avaliacoes integer,
  categoria text,
  status_negocio text,
  horario_funcionamento text,
  google_maps_url text,
  latitude numeric,
  longitude numeric,
  nicho text,
  localidade text,
  contatado boolean default false,
  criado_em timestamp default now()
);

create index if not exists idx_leads_usuario on leads(usuario_id);
