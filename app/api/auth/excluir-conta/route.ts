// Envia um e-mail de confirmação para excluir a conta (a exclusão só ocorre ao confirmar)
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { pool } from '@/lib/db';
import { usuarioDaSessao, conferirSenha } from '@/lib/auth';
import { checarRateLimit } from '@/lib/rateLimit';
import { enviarEmailConfirmarExclusao } from '@/lib/email';

export async function POST(req: NextRequest) {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const limite = await checarRateLimit(`excluir-conta:${sessao.usuarioId}`, 3, 60 * 60);
  if (!limite.permitido) {
    return NextResponse.json({ erro: 'Aguarde antes de tentar de novo.' }, { status: 429 });
  }

  const { senha } = await req.json();
  const usuario = await pool.query('select senha_hash, email from usuarios where id = $1', [sessao.usuarioId]);
  if (usuario.rowCount === 0) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });

  const senhaCorreta = await conferirSenha(senha ?? '', usuario.rows[0].senha_hash);
  if (!senhaCorreta) return NextResponse.json({ erro: 'Senha incorreta' }, { status: 401 });

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiraEm = new Date(Date.now() + 60 * 60 * 1000);
  await pool.query(
    "insert into tokens_verificacao (usuario_id, tipo, token_hash, expira_em) values ($1, 'exclusao', $2, $3)",
    [sessao.usuarioId, tokenHash, expiraEm]
  );

  const link = `${process.env.APP_URL}/confirmar-exclusao?token=${token}`;
  await enviarEmailConfirmarExclusao(usuario.rows[0].email, link);

  return NextResponse.json({ ok: true });
}
