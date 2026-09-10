// Retorna dados do usuário logado (para o front saber status da assinatura)
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/auth';

export async function GET() {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ usuario: null });

  const resultado = await pool.query(
    'select id, email, status_assinatura, assinatura_expira_em from usuarios where id = $1',
    [sessao.usuarioId]
  );
  if (resultado.rowCount === 0) return NextResponse.json({ usuario: null });

  return NextResponse.json({ usuario: resultado.rows[0] });
}
