// Confirma e executa a exclusão da conta a partir do token recebido por e-mail
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { pool } from '@/lib/db';
import { encerrarSessaoAtual } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ erro: 'Token obrigatório' }, { status: 400 });

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const resultado = await pool.query(
    "select id, usuario_id, expira_em, usado from tokens_verificacao where token_hash = $1 and tipo = 'exclusao'",
    [tokenHash]
  );
  if (resultado.rowCount === 0) return NextResponse.json({ erro: 'Link inválido ou expirado' }, { status: 400 });

  const tk = resultado.rows[0];
  if (tk.usado || new Date(tk.expira_em) < new Date()) {
    return NextResponse.json({ erro: 'Link inválido ou expirado' }, { status: 400 });
  }

  // Apaga o usuário (cascade remove leads, sessões, tokens e log de atividades)
  await pool.query('delete from usuarios where id = $1', [tk.usuario_id]);

  try { await encerrarSessaoAtual(); } catch {}

  return NextResponse.json({ ok: true });
}
