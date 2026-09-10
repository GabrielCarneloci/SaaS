// Autentica um usuário. Bloqueia a conta após 3 senhas erradas (exige reset por e-mail)
// e aplica rate limit por IP para conter ataques de força bruta.
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { conferirSenha, gerarToken, NOME_COOKIE_SESSAO } from '@/lib/auth';
import { checarRateLimit, ipDoRequest } from '@/lib/rateLimit';

const MAX_TENTATIVAS = 3;

export async function POST(req: NextRequest) {
  const ip = ipDoRequest(req);

  // Rate limit por IP: no máximo 10 tentativas de login a cada 15 min
  const limite = await checarRateLimit(`login:${ip}`, 10, 15 * 60);
  if (!limite.permitido) {
    return NextResponse.json(
      { erro: `Muitas tentativas. Tente novamente em ${Math.ceil(limite.resetaEm / 60)} minutos.` },
      { status: 429 }
    );
  }

  const { email, senha } = await req.json();
  if (!email || !senha) {
    return NextResponse.json({ erro: 'Informe e-mail e senha' }, { status: 400 });
  }

  try {
    const resultado = await pool.query(
      'select id, senha_hash, bloqueado, tentativas_login, bloqueado_ate from usuarios where email = $1',
      [email]
    );
    // Resposta genérica para não revelar se o e-mail existe
    if (resultado.rowCount === 0) {
      return NextResponse.json({ erro: 'E-mail ou senha incorretos' }, { status: 401 });
    }

    const usuario = resultado.rows[0];

    if (usuario.bloqueado) {
      return NextResponse.json({ erro: 'Sua conta está bloqueada. Fale com o suporte.' }, { status: 403 });
    }

    // Conta travada por excesso de tentativas → precisa redefinir a senha
    if (usuario.tentativas_login >= MAX_TENTATIVAS) {
      return NextResponse.json(
        { erro: 'Conta temporariamente travada por tentativas incorretas. Redefina sua senha por e-mail.', precisaReset: true },
        { status: 423 }
      );
    }

    const senhaCorreta = await conferirSenha(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      const novasTentativas = usuario.tentativas_login + 1;
      await pool.query('update usuarios set tentativas_login = $1 where id = $2', [novasTentativas, usuario.id]);
      const restantes = MAX_TENTATIVAS - novasTentativas;
      if (restantes <= 0) {
        return NextResponse.json(
          { erro: 'Conta travada por tentativas incorretas. Redefina sua senha por e-mail.', precisaReset: true },
          { status: 423 }
        );
      }
      return NextResponse.json(
        { erro: `E-mail ou senha incorretos. Tentativas restantes: ${restantes}` },
        { status: 401 }
      );
    }

    // Sucesso → zera o contador
    await pool.query('update usuarios set tentativas_login = 0, bloqueado_ate = null where id = $1', [usuario.id]);

    const token = await gerarToken(usuario.id);
    const resposta = NextResponse.json({ ok: true });
    resposta.cookies.set(NOME_COOKIE_SESSAO, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    return resposta;
  } catch (erro) {
    console.error('Erro no login:', erro);
    return NextResponse.json({ erro: 'Falha ao entrar' }, { status: 500 });
  }
}
