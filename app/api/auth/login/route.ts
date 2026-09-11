// Autentica um usuário. Bloqueia a conta após 3 senhas erradas, aplica rate limit
// por IP, cria uma sessão controlada no banco e registra a atividade.
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { conferirSenha, criarSessao, registrarAtividade } from '@/lib/auth';
import { checarRateLimit, ipDoRequest } from '@/lib/rateLimit';

const MAX_TENTATIVAS = 3;

export async function POST(req: NextRequest) {
  const ip = ipDoRequest(req);
  const userAgent = req.headers.get('user-agent') || 'desconhecido';

  const limite = await checarRateLimit(`login:${ip}`, 10, 15 * 60);
  if (!limite.permitido) {
    return NextResponse.json(
      { erro: `Muitas tentativas. Tente novamente em ${Math.ceil(limite.resetaEm / 60)} minutos.` },
      { status: 429 }
    );
  }

  const { email, senha, lembrar } = await req.json();
  if (!email || !senha) {
    return NextResponse.json({ erro: 'Informe e-mail e senha' }, { status: 400 });
  }

  try {
    const resultado = await pool.query(
      'select id, senha_hash, bloqueado, tentativas_login from usuarios where email = $1',
      [email]
    );
    if (resultado.rowCount === 0) {
      return NextResponse.json({ erro: 'E-mail ou senha incorretos' }, { status: 401 });
    }

    const usuario = resultado.rows[0];

    if (usuario.bloqueado) {
      return NextResponse.json({ erro: 'Sua conta está bloqueada. Fale com o suporte.' }, { status: 403 });
    }
    if (usuario.tentativas_login >= MAX_TENTATIVAS) {
      return NextResponse.json(
        { erro: 'Conta travada por tentativas incorretas. Redefina sua senha por e-mail.', precisaReset: true },
        { status: 423 }
      );
    }

    const senhaCorreta = await conferirSenha(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      const novasTentativas = usuario.tentativas_login + 1;
      await pool.query('update usuarios set tentativas_login = $1 where id = $2', [novasTentativas, usuario.id]);
      await registrarAtividade(usuario.id, 'login_falhou', ip);
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

    await pool.query('update usuarios set tentativas_login = 0 where id = $1', [usuario.id]);
    await criarSessao(usuario.id, ip, userAgent, Boolean(lembrar));
    await registrarAtividade(usuario.id, 'login', ip);

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error('Erro no login:', erro);
    return NextResponse.json({ erro: 'Falha ao entrar' }, { status: 500 });
  }
}
