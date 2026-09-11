// Troca de senha e/ou e-mail do usuário logado
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { pool } from '@/lib/db';
import { usuarioDaSessao, conferirSenha, gerarHash, registrarAtividade } from '@/lib/auth';
import { ipDoRequest } from '@/lib/rateLimit';
import { enviarEmailVerificacao } from '@/lib/email';

export async function POST(req: NextRequest) {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const ip = ipDoRequest(req);
  const { senhaAtual, novaSenha, novoEmail } = await req.json();

  if (!senhaAtual) {
    return NextResponse.json({ erro: 'Informe sua senha atual para confirmar' }, { status: 400 });
  }

  const usuario = await pool.query('select senha_hash, email from usuarios where id = $1', [sessao.usuarioId]);
  if (usuario.rowCount === 0) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });

  const senhaCorreta = await conferirSenha(senhaAtual, usuario.rows[0].senha_hash);
  if (!senhaCorreta) return NextResponse.json({ erro: 'Senha atual incorreta' }, { status: 401 });

  const mensagens: string[] = [];

  if (novaSenha) {
    if (novaSenha.length < 6) {
      return NextResponse.json({ erro: 'A nova senha precisa de pelo menos 6 caracteres' }, { status: 400 });
    }
    const hash = await gerarHash(novaSenha);
    await pool.query('update usuarios set senha_hash = $1 where id = $2', [hash, sessao.usuarioId]);
    await registrarAtividade(sessao.usuarioId, 'senha_alterada', ip);
    mensagens.push('Senha alterada');
  }

  if (novoEmail && novoEmail !== usuario.rows[0].email) {
    const existente = await pool.query('select id from usuarios where email = $1', [novoEmail]);
    if ((existente.rowCount ?? 0) > 0) {
      return NextResponse.json({ erro: 'Este e-mail já está em uso' }, { status: 409 });
    }

    // Troca o e-mail imediatamente, mas exige nova verificação
    await pool.query('update usuarios set email = $1, email_verificado = false where id = $2', [novoEmail, sessao.usuarioId]);
    await registrarAtividade(sessao.usuarioId, 'email_alterado', ip, `novo: ${novoEmail}`);

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.query(
      "insert into tokens_verificacao (usuario_id, tipo, token_hash, expira_em) values ($1, 'email', $2, $3)",
      [sessao.usuarioId, tokenHash, expiraEm]
    );
    const link = `${process.env.APP_URL}/verificar-email?token=${token}`;
    await enviarEmailVerificacao(novoEmail, link);
    mensagens.push('E-mail atualizado — confirme o novo endereço');
  }

  return NextResponse.json({ ok: true, mensagens });
}
