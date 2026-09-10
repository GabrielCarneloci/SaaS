-- Rode este script para adicionar os novos campos com dados completos do Google Maps

alter table leads add column if not exists categoria text;
alter table leads add column if not exists status_negocio text;
alter table leads add column if not exists horario_funcionamento text;
alter table leads add column if not exists google_maps_url text;
alter table leads add column if not exists latitude numeric;
alter table leads add column if not exists longitude numeric;
alter table leads add column if not exists total_avaliacoes integer;
