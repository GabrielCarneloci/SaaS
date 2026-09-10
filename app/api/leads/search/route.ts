// Busca empresas no Google Maps (Google Places API - New), filtra as sem site
// e salva vinculado ao usuário logado
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { pool } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const { nicho, localidade } = await req.json();
  if (!nicho || !localidade) {
    return NextResponse.json({ erro: 'Informe nicho e localidade' }, { status: 400 });
  }

  try {
    const resposta = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      {
        textQuery: `${nicho} em ${localidade}`,
        languageCode: 'pt-BR',
        regionCode: 'BR',
        maxResultCount: 20,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask':
            'places.displayName,places.formattedAddress,places.rating,places.nationalPhoneNumber,places.websiteUri',
        },
      }
    );

    const estabelecimentos = resposta.data?.places ?? [];
    const semSite = estabelecimentos.filter((e: any) => !e.websiteUri && e.nationalPhoneNumber);

    for (const e of semSite) {
      await pool.query(
        `insert into leads (usuario_id, nome, endereco, telefone, avaliacao, nicho, localidade)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          sessao.usuarioId,
          e.displayName?.text ?? 'Sem nome',
          e.formattedAddress ?? '',
          e.nationalPhoneNumber,
          e.rating ?? null,
          nicho,
          localidade,
        ]
      );
    }

    return NextResponse.json({ total: semSite.length });
  } catch (erro: any) {
    console.error('Erro na busca:', erro?.response?.data || erro.message);
    return NextResponse.json({ erro: 'Falha ao buscar leads' }, { status: 500 });
  }
}
