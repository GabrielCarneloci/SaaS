-- Notas e etiquetas por lead, e histórico de buscas

alter table leads add column if not exists notas text;
alter table leads add column if not exists tags text[] default '{}';

create table if not exists historico_buscas (
  id serial primary key,
  usuario_id integer references usuarios(id) on delete cascade,
  nicho text not null,
  localidade text not null,
  total integer not null default 0,
  criado_em timestamp default now()
);
create index if not exists idx_historico_usuario on historico_buscas(usuario_id);
