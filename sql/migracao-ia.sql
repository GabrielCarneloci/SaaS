-- Campos para guardar o resultado da IA por lead (evita gerar de novo sem necessidade)
alter table leads add column if not exists mensagem_ia text;
alter table leads add column if not exists resumo_ia text;
alter table leads add column if not exists ia_gerado_em timestamp;
