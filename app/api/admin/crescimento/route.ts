// Série temporal de novos usuários e novos leads, últimos 30 dias
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { exigirAdmin } from '@/lib/admin';

export async function GET() {
  const admin = await exigirAdmin();
  if (!admin) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const usuariosPorDia = await pool.query(`
    select to_char(criado_em, 'YYYY-MM-DD') as dia, count(*)::int as total
    from usuarios
    where criado_em >= now() - interval '30 days'
    group by dia order by dia
  `);

  const leadsPorDia = await pool.query(`
    select to_char(criado_em, 'YYYY-MM-DD') as dia, count(*)::int as total
    from leads
    where criado_em >= now() - interval '30 days'
    group by dia order by dia
  `);

  return NextResponse.json({
    usuarios: usuariosPorDia.rows,
    leads: leadsPorDia.rows,
  });
}
