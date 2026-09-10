// Busca pública (sem login): retorna resultados só para exibir borrados como amostra.
// Não salva nada no banco. Fica FORA de /api/leads/* protegido pelo middleware.
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { checarRateLimit, ipDoRequest } from '@/lib/rateLimit';

async function buscarTodasAsPaginas(nicho: string, localidade: string) {
  let todos: any[] = [];
  let pageToken: string | undefined;

  for (let pagina = 0; pagina < 3; pagina++) {
    const corpo: any = {
      textQuery: `${nicho} em ${localidade}`,
      languageCode: 'pt-BR',
      regionCode: 'BR',
      maxResultCount: 20,
    };
    if (pageToken) corpo.pageToken = pageToken;

    const resposta = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      corpo,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask':
            'places.displayName,places.formattedAddress,places.rating,places.nationalPhoneNumber,places.websiteUri,nextPageToken',
        },
      }
    );

    const places = resposta.data?.places ?? [];
    todos = todos.concat(places);

    pageToken = resposta.data?.nextPageToken;
    if (!pageToken || places.length === 0) break;

    await new Promise((r) => setTimeout(r, 1500));
  }

  return todos;
}

export async function POST(req: NextRequest) {
  const ip = ipDoRequest(req);
  const limite = await checarRateLimit(`preview:${ip}`, 5, 60 * 60);
  if (!limite.permitido) {
    return NextResponse.json({ erro: 'Muitas buscas. Crie uma conta para continuar.' }, { status: 429 });
  }

  const { nicho, localidade } = await req.json();
  if (!nicho || !localidade) {
    return NextResponse.json({ erro: 'Informe nicho e localidade' }, { status: 400 });
  }

  try {
    const estabelecimentos = await buscarTodasAsPaginas(nicho, localidade);
    const semSite = estabelecimentos.filter((e: any) => !e.websiteUri && e.nationalPhoneNumber);

    // Dados mascarados — só a quantidade real importa para a prévia
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
