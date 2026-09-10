// Gera um token de redefinição e envia o link por e-mail.
// Nunca revela se o e-mail existe (resposta sempre igual).
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { pool } from '@/lib/db';
import { enviarEmailReset } from '@/lib/email';
import { checarRateLimit, ipDoRequest } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const ip = ipDoRequest(req);
  const limite = await checarRateLimit(`reset:${ip}`, 5, 60 * 60);
  if (!limite.permitido) {
    return NextResponse.json({ erro: 'Muitas solicitações. Tente mais tarde.' }, { status: 429 });
  }

  const { email } = await req.json();
  const respostaGenerica = NextResponse.json({
    ok: true,
    mensagem: 'Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha.',
  });

  if (!email) return respostaGenerica;

  try {
    const resultado = await pool.query('select id from usuarios where email = $1', [email]);
    if (resultado.rowCount === 0) return respostaGenerica; // não revela

    const usuarioId = resultado.rows[0].id;

    // Gera token aleatório; guarda só o hash no banco
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiraEm = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await pool.query(
      'insert into tokens_reset (usuario_id, token_hash, expira_em) values ($1, $2, $3)',
      [usuarioId, tokenHash, expiraEm]
    );

    const link = `${process.env.APP_URL}/redefinir-senha?token=${token}`;
    await enviarEmailReset(email, link);

    return respostaGenerica;
  } catch (erro) {
    console.error('Erro ao pedir reset:', erro);
    return respostaGenerica; // mesmo em erro, não revela nada
  }
}
