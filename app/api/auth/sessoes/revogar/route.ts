// Revoga uma sessão específica (não permite revogar a atual por aqui — use /logout)
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const { sessaoId } = await req.json();
  if (!sessaoId) return NextResponse.json({ erro: 'sessaoId obrigatório' }, { status: 400 });

  await pool.query(
    'update sessoes set revogada = true where id = $1 and usuario_id = $2',
    [sessaoId, sessao.usuarioId]
  );

  return NextResponse.json({ ok: true });
}
