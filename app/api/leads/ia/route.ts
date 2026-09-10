// Gera (ou retorna do cache) a mensagem de abordagem e o resumo de oportunidade de um lead
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/auth';
import { checarRateLimit } from '@/lib/rateLimit';
import { gerarMensagemAbordagem, gerarResumoOportunidade } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  // Limite: 20 gerações por hora por usuário (protege a cota gratuita do Gemini)
  const limite = await checarRateLimit(`ia:${sessao.usuarioId}`, 20, 60 * 60);
  if (!limite.permitido) {
    return NextResponse.json(
      { erro: `Limite de gerações por IA atingido. Tente novamente em ${Math.ceil(limite.resetaEm / 60)} minutos.` },
      { status: 429 }
    );
  }

  const { id, forcar } = await req.json();
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 });

  const resultado = await pool.query(
    `select nome, categoria, endereco, telefone, avaliacao::float8 as avaliacao,
            total_avaliacoes, horario_funcionamento, notas, mensagem_ia, resumo_ia
     from leads where id = $1 and usuario_id = $2`,
    [id, sessao.usuarioId]
  );
  if (resultado.rowCount === 0) {
    return NextResponse.json({ erro: 'Lead não encontrado' }, { status: 404 });
  }

  const lead = resultado.rows[0];

  // Se já tem gerado e não pediu para forçar, devolve do cache (economiza cota)
  if (!forcar && lead.mensagem_ia && lead.resumo_ia) {
    return NextResponse.json({ mensagem: lead.mensagem_ia, resumo: lead.resumo_ia, doCache: true });
  }

  try {
    const [mensagem, resumo] = await Promise.all([
      gerarMensagemAbordagem(lead),
      gerarResumoOportunidade(lead),
    ]);

    await pool.query(
      'update leads set mensagem_ia = $1, resumo_ia = $2, ia_gerado_em = now() where id = $3',
      [mensagem, resumo, id]
    );

    return NextResponse.json({ mensagem, resumo, doCache: false });
  } catch (erro: any) {
    console.error('Erro ao gerar com IA:', erro.message);
    return NextResponse.json({ erro: 'Não foi possível gerar agora. Tente de novo em instantes.' }, { status: 500 });
  }
}
