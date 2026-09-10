// Alterna o status "contatado" de um lead do usuário logado
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/auth';
import { checarRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const limite = await checarRateLimit(`toggle:${sessao.usuarioId}`, 60, 60);
  if (!limite.permitido) {
    return NextResponse.json({ erro: 'Muitas requisições. Aguarde um momento.' }, { status: 429 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 });

  await pool.query(
    'update leads set contatado = not contatado where id = $1 and usuario_id = $2',
    [id, sessao.usuarioId]
  );
  return NextResponse.json({ ok: true });
}
