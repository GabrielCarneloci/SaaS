// Histórico de buscas do usuário logado
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/auth';

export async function GET() {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const resultado = await pool.query(
    `select id, nicho, localidade, total, criado_em
     from historico_buscas where usuario_id = $1
     order by id desc limit 20`,
    [sessao.usuarioId]
  );
  return NextResponse.json({ historico: resultado.rows });
}
