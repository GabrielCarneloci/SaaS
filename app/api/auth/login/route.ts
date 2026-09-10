// Autentica um usuário existente
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { conferirSenha, gerarToken, NOME_COOKIE_SESSAO } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, senha } = await req.json();

  if (!email || !senha) {
    return NextResponse.json({ erro: 'Informe e-mail e senha' }, { status: 400 });
  }

  try {
    const resultado = await pool.query(
      'select id, senha_hash, bloqueado from usuarios where email = $1',
      [email]
    );
    if (resultado.rowCount === 0) {
      return NextResponse.json({ erro: 'E-mail ou senha incorretos' }, { status: 401 });
    }

    const usuario = resultado.rows[0];
    const senhaCorreta = await conferirSenha(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      return NextResponse.json({ erro: 'E-mail ou senha incorretos' }, { status: 401 });
    }
    if (usuario.bloqueado) {
      return NextResponse.json({ erro: 'Sua conta está bloqueada. Fale com o suporte.' }, { status: 403 });
    }

    const token = await gerarToken(usuario.id);
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
    console.error('Erro no login:', erro);
    return NextResponse.json({ erro: 'Falha ao entrar' }, { status: 500 });
  }
}
