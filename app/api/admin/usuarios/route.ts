// Lista todos os usuários com contagem de leads (somente admin)
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { exigirAdmin } from '@/lib/admin';

export async function GET() {
  const admin = await exigirAdmin();
  if (!admin) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const resultado = await pool.query(`
    select u.id, u.email, u.bloqueado, u.is_admin, u.criado_em,
           count(l.id)::int as total_leads
    from usuarios u
    left join leads l on l.usuario_id = u.id
    group by u.id
    order by u.criado_em desc
  `);

  return NextResponse.json({ usuarios: resultado.rows });
}
