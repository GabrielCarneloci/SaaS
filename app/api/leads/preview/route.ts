// Busca pública (sem login): retorna resultados só para exibir borrados como amostra.
// Não salva nada no banco. Fica FORA de /api/leads/* protegido pelo middleware.
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
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

    // Retorna dados FALSOS/mascarados — só a quantidade real importa para a prévia.
    // Assim, mesmo inspecionando a rede, ninguém extrai leads reais sem login.
    const mascarados = semSite.map(() => ({
      nome: 'Empresa Ltda ••••••••',
      endereco: 'Rua ••••••••••, Centro',
      avaliacao: 4.5,
      telefone: '(••) ••••-••••',
    }));

    return NextResponse.json({ total: mascarados.length, leads: mascarados });
  } catch (erro: any) {
    console.error('Erro na prévia:', erro?.response?.data || erro.message);
    return NextResponse.json({ erro: 'Falha ao buscar' }, { status: 500 });
  }
}
