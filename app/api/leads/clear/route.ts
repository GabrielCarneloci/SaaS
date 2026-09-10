// Apaga todos os leads do usuário logado
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/auth';
import { checarRateLimit } from '@/lib/rateLimit';

export async function POST() {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const limite = await checarRateLimit(`clear:${sessao.usuarioId}`, 10, 60);
  if (!limite.permitido) {
    return NextResponse.json({ erro: 'Muitas requisições. Aguarde um momento.' }, { status: 429 });
  }

  await pool.query('delete from leads where usuario_id = $1', [sessao.usuarioId]);
  return NextResponse.json({ ok: true });
}
