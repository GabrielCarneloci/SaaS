// Cria uma conta nova, com verificação de e-mail obrigatória
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { pool } from '@/lib/db';
import { gerarHash, criarSessao, registrarAtividade } from '@/lib/auth';
import { checarRateLimit, ipDoRequest } from '@/lib/rateLimit';
import { enviarEmailVerificacao } from '@/lib/email';

export async function POST(req: NextRequest) {
  const ip = ipDoRequest(req);
  const userAgent = req.headers.get('user-agent') || 'desconhecido';

  const limite = await checarRateLimit(`registro:${ip}`, 5, 60 * 60);
  if (!limite.permitido) {
    return NextResponse.json({ erro: 'Muitas contas criadas deste IP. Tente mais tarde.' }, { status: 429 });
  }

  const { email, senha } = await req.json();
  if (!email || !senha || senha.length < 6) {
    return NextResponse.json(
      { erro: 'Informe um e-mail válido e senha com pelo menos 6 caracteres' },
      { status: 400 }
    );
  }

  try {
    const existente = await pool.query('select id from usuarios where email = $1', [email]);
    if ((existente.rowCount ?? 0) > 0) {
      return NextResponse.json({ erro: 'Este e-mail já está cadastrado' }, { status: 409 });
    }

    const hash = await gerarHash(senha);
    const resultado = await pool.query(
      'insert into usuarios (email, senha_hash) values ($1, $2) returning id',
      [email, hash]
    );
    const usuarioId = resultado.rows[0].id;

    await criarSessao(usuarioId, ip, userAgent, true);
    await registrarAtividade(usuarioId, 'cadastro', ip);

    // Gera o token de verificação de e-mail e envia
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.query(
      "insert into tokens_verificacao (usuario_id, tipo, token_hash, expira_em) values ($1, 'email', $2, $3)",
      [usuarioId, tokenHash, expiraEm]
    );
    const link = `${process.env.APP_URL}/verificar-email?token=${token}`;
    enviarEmailVerificacao(email, link).catch((e) => console.error('Falha ao enviar e-mail de verificação:', e));

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error('Erro ao registrar:', erro);
    return NextResponse.json({ erro: 'Falha ao criar conta' }, { status: 500 });
  }
}
