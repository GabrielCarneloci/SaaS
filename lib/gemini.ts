// Integração com o Google Gemini (gratuito, plano grátis generoso)
// Chave em: aistudio.google.com/apikey
// O nome do modelo muda com frequência — configure via GEMINI_MODEL no .env
// se a Google descontinuar o atual. Modelo padrão atualizado em set/2026.
const MODELO = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

interface DadosLead {
  nome: string;
  categoria: string | null;
  endereco: string;
  telefone: string;
  avaliacao: number | null;
  total_avaliacoes: number | null;
  horario_funcionamento: string | null;
  notas: string | null;
}

function montarContexto(lead: DadosLead): string {
  return [
    `Nome da empresa: ${lead.nome}`,
    lead.categoria ? `Categoria: ${lead.categoria}` : null,
    `Endereço: ${lead.endereco}`,
    lead.avaliacao
      ? `Avaliação no Google: ${lead.avaliacao} de 5, com ${lead.total_avaliacoes ?? 0} avaliações`
      : 'Sem avaliações no Google ainda',
    lead.horario_funcionamento ? `Horário de funcionamento: ${lead.horario_funcionamento}` : null,
    lead.notas ? `Anotações do vendedor sobre esse lead: ${lead.notas}` : null,
    'Fato importante: esta empresa NÃO possui site.',
  ].filter(Boolean).join('\n');
}

async function chamarGemini(prompt: string, tentativa = 1): Promise<string> {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new Error('GEMINI_API_KEY não configurada');

  const resposta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${chave}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    }
  );

  // O plano grátis do Gemini às vezes fica sobrecarregado (503) — tenta de novo com espera
  if ((resposta.status === 503 || resposta.status === 429) && tentativa < 3) {
    await new Promise((r) => setTimeout(r, tentativa * 1200));
    return chamarGemini(prompt, tentativa + 1);
  }

  if (!resposta.ok) {
    const erro = await resposta.text();
    throw new Error(`Gemini respondeu ${resposta.status}: ${erro.slice(0, 200)}`);
  }

  const dados = await resposta.json();
  const texto = dados?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) throw new Error('Gemini não retornou texto');
  return texto.trim();
}

export async function gerarMensagemAbordagem(lead: DadosLead): Promise<string> {
  const contexto = montarContexto(lead);
  const prompt = `Você é um vendedor experiente de criação de sites para pequenos negócios locais no Brasil.

Dados do lead:
${contexto}

Escreva uma mensagem curta (máximo 4 frases) para enviar por WhatsApp, em português informal e natural,
oferecendo a criação de um site profissional. Cite um detalhe específico da empresa para não parecer genérico.
Não use saudações longas nem se apresente com nome de empresa fictício. Não use emojis em excesso (no máximo 1).
Responda só com o texto da mensagem, sem explicações.`;

  return chamarGemini(prompt);
}

export async function gerarResumoOportunidade(lead: DadosLead): Promise<string> {
  const contexto = montarContexto(lead);
  const prompt = `Você é um consultor de vendas analisando um lead para um vendedor de sites.

Dados do lead:
${contexto}

Em no máximo 3 frases curtas, avalie: (1) o quão promissora é essa oportunidade e por quê,
(2) qual ângulo de venda usar (ex: credibilidade, concorrência, alcance de clientes),
(3) um ponto de atenção, se houver algum motivo pra suspeitar que não vai fechar fácil.
Seja direto e prático, sem enrolação. Responda só com a análise, sem introdução.`;

  return chamarGemini(prompt);
}
