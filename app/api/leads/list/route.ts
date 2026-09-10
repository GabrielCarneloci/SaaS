// Lista os leads do usuário logado
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/auth';

export async function GET() {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const resultado = await pool.query(
    'select id, nome, endereco, telefone, avaliacao, contatado from leads where usuario_id = $1 order by id desc',
    [sessao.usuarioId]
  );
  return NextResponse.json({ leads: resultado.rows });
}
