// Lista todos os leads de todos os usuários (somente admin)
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { exigirAdmin } from '@/lib/admin';

export async function GET() {
  const admin = await exigirAdmin();
  if (!admin) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const resultado = await pool.query(`
    select l.id, l.nome, l.endereco, l.telefone, l.avaliacao, l.nicho, l.localidade, l.contatado, l.criado_em,
           u.email as usuario_email
    from leads l
    join usuarios u on u.id = l.usuario_id
    order by l.criado_em desc
    limit 500
  `);

  return NextResponse.json({ leads: resultado.rows });
}
