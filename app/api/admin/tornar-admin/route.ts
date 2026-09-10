// Promove ou remove um usuário do cargo de administrador
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { exigirAdmin } from '@/lib/admin';

export async function POST(req: NextRequest) {
  const admin = await exigirAdmin();
  if (!admin) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const { usuarioId } = await req.json();
  if (!usuarioId) return NextResponse.json({ erro: 'usuarioId obrigatório' }, { status: 400 });

  await pool.query('update usuarios set is_admin = not is_admin where id = $1', [usuarioId]);
  return NextResponse.json({ ok: true });
}
