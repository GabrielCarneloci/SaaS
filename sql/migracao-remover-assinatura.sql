-- Rode este script SE você já tinha o banco criado com a versão anterior
-- (que tinha status_assinatura). Ele ajusta a tabela existente sem apagar dados.

alter table usuarios drop column if exists status_assinatura;
alter table usuarios drop column if exists assinatura_expira_em;
alter table usuarios drop column if exists mp_preapproval_id;
alter table usuarios add column if not exists bloqueado boolean not null default false;
alter table usuarios add column if not exists is_admin boolean not null default false;
