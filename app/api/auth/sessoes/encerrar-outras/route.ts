// Encerra todas as sessões, exceto a atual ("sair de todos os outros dispositivos")
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/auth';

export async function POST() {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  await pool.query(
    'update sessoes set revogada = true where usuario_id = $1 and id != $2',
    [sessao.usuarioId, sessao.sessaoId]
  );

  return NextResponse.json({ ok: true });
}
