// Lista os leads do usuário logado, com todos os dados coletados e anotações
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/auth';

export async function GET() {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const resultado = await pool.query(
    `select id, nome, endereco, telefone, avaliacao, total_avaliacoes, categoria,
            status_negocio, horario_funcionamento, google_maps_url, latitude, longitude,
            nicho, localidade, contatado, notas, tags, criado_em
     from leads where usuario_id = $1 order by id desc`,
    [sessao.usuarioId]
  );
  return NextResponse.json({ leads: resultado.rows });
}
