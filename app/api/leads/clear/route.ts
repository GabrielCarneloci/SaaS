// Apaga todos os leads do usuário logado
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/auth';

export async function POST() {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  await pool.query('delete from leads where usuario_id = $1', [sessao.usuarioId]);
  return NextResponse.json({ ok: true });
}
