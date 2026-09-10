// Leads de um usuário específico, com notas/etiquetas, e os nichos/cidades mais buscados por ele
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { exigirAdmin } from '@/lib/admin';

export async function GET(req: NextRequest) {
  const admin = await exigirAdmin();
  if (!admin) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const usuarioId = req.nextUrl.searchParams.get('usuarioId');
  if (!usuarioId) return NextResponse.json({ erro: 'usuarioId obrigatório' }, { status: 400 });

  const leads = await pool.query(
    `select id, nome, endereco, telefone, avaliacao::float8 as avaliacao, nicho, localidade,
            contatado, notas, tags, criado_em
     from leads where usuario_id = $1 order by id desc limit 200`,
    [usuarioId]
  );

  const topNichos = await pool.query(
    `select nicho, count(*)::int as total from leads where usuario_id = $1
     group by nicho order by total desc limit 5`,
    [usuarioId]
  );

  const topCidades = await pool.query(
    `select localidade, count(*)::int as total from leads where usuario_id = $1
     group by localidade order by total desc limit 5`,
    [usuarioId]
  );

  return NextResponse.json({
    leads: leads.rows,
    topNichos: topNichos.rows,
    topCidades: topCidades.rows,
  });
}
