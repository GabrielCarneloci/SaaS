// Lista as últimas atividades da conta do usuário logado
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/auth';

export async function GET() {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const resultado = await pool.query(
    'select tipo, detalhe, ip, criado_em from log_atividades where usuario_id = $1 order by criado_em desc limit 30',
    [sessao.usuarioId]
  );

  return NextResponse.json({ atividades: resultado.rows });
}
