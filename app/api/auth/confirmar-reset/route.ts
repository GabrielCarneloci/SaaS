// Valida o token e define a nova senha. Zera as tentativas de login.
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { pool } from '@/lib/db';
import { gerarHash } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { token, novaSenha } = await req.json();

  if (!token || !novaSenha || novaSenha.length < 6) {
    return NextResponse.json({ erro: 'Token inválido ou senha muito curta (mín. 6 caracteres)' }, { status: 400 });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resultado = await pool.query(
      'select id, usuario_id, expira_em, usado from tokens_reset where token_hash = $1',
      [tokenHash]
    );

    if (resultado.rowCount === 0) {
      return NextResponse.json({ erro: 'Link inválido ou expirado' }, { status: 400 });
    }

    const tk = resultado.rows[0];
    if (tk.usado || new Date(tk.expira_em) < new Date()) {
      return NextResponse.json({ erro: 'Link inválido ou expirado' }, { status: 400 });
    }

    const hash = await gerarHash(novaSenha);
    await pool.query('update usuarios set senha_hash = $1, tentativas_login = 0, bloqueado_ate = null where id = $2', [hash, tk.usuario_id]);
    await pool.query('update tokens_reset set usado = true where id = $1', [tk.id]);

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error('Erro ao confirmar reset:', erro);
    return NextResponse.json({ erro: 'Falha ao redefinir senha' }, { status: 500 });
  }
}
