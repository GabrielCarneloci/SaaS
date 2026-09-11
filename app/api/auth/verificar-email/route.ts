// Confirma o e-mail a partir do token enviado por e-mail
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { pool } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ erro: 'Token obrigatório' }, { status: 400 });

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const resultado = await pool.query(
    "select id, usuario_id, expira_em, usado from tokens_verificacao where token_hash = $1 and tipo = 'email'",
    [tokenHash]
  );
  if (resultado.rowCount === 0) return NextResponse.json({ erro: 'Link inválido ou expirado' }, { status: 400 });

  const tk = resultado.rows[0];
  if (tk.usado || new Date(tk.expira_em) < new Date()) {
    return NextResponse.json({ erro: 'Link inválido ou expirado' }, { status: 400 });
  }

  await pool.query('update usuarios set email_verificado = true where id = $1', [tk.usuario_id]);
  await pool.query('update tokens_verificacao set usado = true where id = $1', [tk.id]);

  return NextResponse.json({ ok: true });
}
