// Rota que busca empresas no Google Maps (via Google Places API - New)
// e filtra apenas as que NÃO possuem site cadastrado
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { salvarLeads } from '@/lib/localStorage';

export async function POST(req: NextRequest) {
  const { nicho, localidade } = await req.json();

  if (!nicho || !localidade) {
    return NextResponse.json(
      { erro: 'Informe nicho e localidade' },
      { status: 400 }
    );
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

    const semSite = estabelecimentos
      .filter((e: any) => !e.websiteUri && e.nationalPhoneNumber)
      .map((e: any) => ({
        nome: e.displayName?.text ?? 'Sem nome',
        endereco: e.formattedAddress ?? '',
        avaliacao: e.rating ?? null,
        telefone: e.nationalPhoneNumber,
        nicho,
        localidade,
        criado_em: new Date().toISOString(),
      }));

    if (semSite.length > 0) {
      salvarLeads(semSite);
    }

    return NextResponse.json({ total: semSite.length, leads: semSite });
  } catch (erro: any) {
    console.error('Erro na busca de leads:', erro?.response?.data || erro.message);
    return NextResponse.json({ erro: 'Falha ao buscar leads' }, { status: 500 });
  }
}
