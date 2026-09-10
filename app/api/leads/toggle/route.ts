// Alterna o status "contatado" de um lead do usuário logado
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 });

  await pool.query(
    'update leads set contatado = not contatado where id = $1 and usuario_id = $2',
    [id, sessao.usuarioId]
  );
  return NextResponse.json({ ok: true });
}
