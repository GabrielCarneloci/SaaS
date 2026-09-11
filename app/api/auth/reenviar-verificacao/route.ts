// Reenvia o e-mail de verificação para o usuário logado
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { pool } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/auth';
import { checarRateLimit } from '@/lib/rateLimit';
import { enviarEmailVerificacao } from '@/lib/email';

export async function POST() {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const limite = await checarRateLimit(`reenviar-verif:${sessao.usuarioId}`, 3, 15 * 60);
  if (!limite.permitido) {
    return NextResponse.json({ erro: 'Aguarde alguns minutos antes de pedir de novo.' }, { status: 429 });
  }

  const usuario = await pool.query('select email, email_verificado from usuarios where id = $1', [sessao.usuarioId]);
  if (usuario.rowCount === 0) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });
  if (usuario.rows[0].email_verificado) return NextResponse.json({ ok: true, jaVerificado: true });

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await pool.query(
    "insert into tokens_verificacao (usuario_id, tipo, token_hash, expira_em) values ($1, 'email', $2, $3)",
    [sessao.usuarioId, tokenHash, expiraEm]
  );
  const link = `${process.env.APP_URL}/verificar-email?token=${token}`;
  await enviarEmailVerificacao(usuario.rows[0].email, link);

  return NextResponse.json({ ok: true });
}
