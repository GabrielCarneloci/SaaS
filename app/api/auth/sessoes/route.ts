// Lista as sessões ativas do usuário logado
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/auth';

export async function GET() {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const resultado = await pool.query(
    `select id, ip, user_agent, criado_em, ultimo_uso
     from sessoes where usuario_id = $1 and revogada = false
     order by ultimo_uso desc`,
    [sessao.usuarioId]
  );

  return NextResponse.json({
    sessoes: resultado.rows,
    sessaoAtualId: sessao.sessaoId,
  });
}
