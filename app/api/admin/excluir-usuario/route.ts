// Exclui um usuário e todos os leads dele (cascade). Não permite excluir admin.
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { exigirAdmin } from '@/lib/admin';

export async function POST(req: NextRequest) {
  const admin = await exigirAdmin();
  if (!admin) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const { usuarioId } = await req.json();
  if (!usuarioId) return NextResponse.json({ erro: 'usuarioId obrigatório' }, { status: 400 });

  const alvo = await pool.query('select is_admin from usuarios where id = $1', [usuarioId]);
  if (alvo.rowCount === 0) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });
  if (alvo.rows[0].is_admin) {
    return NextResponse.json({ erro: 'Não é possível excluir um administrador' }, { status: 400 });
  }

  await pool.query('delete from usuarios where id = $1', [usuarioId]);
  return NextResponse.json({ ok: true });
}
