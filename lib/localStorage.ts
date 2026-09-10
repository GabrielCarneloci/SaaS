// Armazenamento em arquivo JSON. No servidor (VPS/Railway), aponte DATA_DIR
// para uma pasta persistente. Localmente usa a pasta ./data.
import fs from 'fs';
import path from 'path';

const DIRETORIO = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const ARQUIVO = path.join(DIRETORIO, 'leads.json');

export interface Lead {
  id: string;
  nome: string;
  endereco: string;
  avaliacao: number | null;
  telefone: string;
  nicho: string;
  localidade: string;
  contatado: boolean;
  criado_em: string;
}

function garantirArquivo() {
  if (!fs.existsSync(DIRETORIO)) {
    fs.mkdirSync(DIRETORIO, { recursive: true });
  }
  if (!fs.existsSync(ARQUIVO)) {
    fs.writeFileSync(ARQUIVO, '[]', 'utf-8');
  }
}

export function lerLeads(): Lead[] {
  garantirArquivo();
  const conteudo = fs.readFileSync(ARQUIVO, 'utf-8');
  const leads = JSON.parse(conteudo);
  // Compatibilidade com registros antigos sem id/contatado
  return leads.map((l: any, i: number) => ({
    id: l.id ?? `${l.criado_em ?? ''}-${i}`,
    contatado: l.contatado ?? false,
    ...l,
  }));
}

function escrever(leads: Lead[]) {
  garantirArquivo();
  fs.writeFileSync(ARQUIVO, JSON.stringify(leads, null, 2), 'utf-8');
}

export function salvarLeads(novos: Lead[]) {
  const atuais = lerLeads();
  escrever([...novos, ...atuais]);
}

// Alterna o status "contatado" de um lead pelo id
export function alternarContatado(id: string) {
  const leads = lerLeads();
  const atualizados = leads.map((l) =>
    l.id === id ? { ...l, contatado: !l.contatado } : l
  );
  escrever(atualizados);
  return atualizados;
}

// Apaga todos os leads
export function limparLeads() {
  escrever([]);
}
