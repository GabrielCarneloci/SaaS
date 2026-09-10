// Cria uma conta nova
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { gerarHash, gerarToken, NOME_COOKIE_SESSAO } from '@/lib/auth';

export async function POST(req: NextRequest) {
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
    const token = await gerarToken(usuarioId);

    const resposta = NextResponse.json({ ok: true });
    resposta.cookies.set(NOME_COOKIE_SESSAO, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    return resposta;
  } catch (erro) {
    console.error('Erro ao registrar:', erro);
    return NextResponse.json({ erro: 'Falha ao criar conta' }, { status: 500 });
  }
}
