// Retorna dados do usuário logado
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/auth';

export async function GET() {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ usuario: null });

  const resultado = await pool.query(
    'select id, email, bloqueado, is_admin, email_verificado from usuarios where id = $1',
    [sessao.usuarioId]
  );
  if (resultado.rowCount === 0) return NextResponse.json({ usuario: null });

  return NextResponse.json({ usuario: resultado.rows[0] });
}
