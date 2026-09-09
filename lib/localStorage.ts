// Armazenamento em arquivo JSON. No Railway, aponte DATA_DIR para o volume
// persistente configurado no serviço (ex: /data) para os leads não se perderem
// a cada novo deploy. Localmente, sem configurar nada, usa a pasta ./data.
import fs from 'fs';
import path from 'path';

const DIRETORIO = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const ARQUIVO = path.join(DIRETORIO, 'leads.json');

interface Lead {
  nome: string;
  endereco: string;
  avaliacao: number | null;
  telefone: string;
  nicho: string;
  localidade: string;
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
  return JSON.parse(conteudo);
}

export function salvarLeads(novos: Lead[]) {
  garantirArquivo();
  const atuais = lerLeads();
  const atualizados = [...novos, ...atuais];
  fs.writeFileSync(ARQUIVO, JSON.stringify(atualizados, null, 2), 'utf-8');
}
