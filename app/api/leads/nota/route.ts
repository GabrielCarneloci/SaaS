// Salva a anotação e as etiquetas de um lead do usuário logado
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const { id, notas, tags } = await req.json();
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 });

  const listaTags = Array.isArray(tags) ? tags.slice(0, 12).map((t: string) => String(t).slice(0, 24)) : [];

  await pool.query(
    'update leads set notas = $1, tags = $2 where id = $3 and usuario_id = $4',
    [notas ?? null, listaTags, id, sessao.usuarioId]
  );
  return NextResponse.json({ ok: true });
}
