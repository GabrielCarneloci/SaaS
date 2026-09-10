// Busca empresas no Google Maps (Google Places API - New), filtra as sem site
// e salva vinculado ao usuário logado. Pagina até 60 resultados (limite do Google).
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { pool } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/auth';
import { checarRateLimit } from '@/lib/rateLimit';

const CAMPOS = [
  'places.displayName',
  'places.formattedAddress',
  'places.rating',
  'places.userRatingCount',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.primaryTypeDisplayName',
  'places.businessStatus',
  'places.googleMapsUri',
  'places.location',
  'places.regularOpeningHours',
  'nextPageToken',
].join(',');

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
          'X-Goog-FieldMask': CAMPOS,
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

function formatarHorario(horario: any): string | null {
  if (!horario?.weekdayDescriptions) return null;
  return horario.weekdayDescriptions.join(' | ');
}

export async function POST(req: NextRequest) {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  // Rate limit por usuário: no máximo 30 buscas por hora
  const limite = await checarRateLimit(`busca:${sessao.usuarioId}`, 30, 60 * 60);
  if (!limite.permitido) {
    return NextResponse.json(
      { erro: `Limite de buscas atingido. Tente novamente em ${Math.ceil(limite.resetaEm / 60)} minutos.` },
      { status: 429 }
    );
  }

  const { nicho, localidade } = await req.json();
  if (!nicho || !localidade) {
    return NextResponse.json({ erro: 'Informe nicho e localidade' }, { status: 400 });
  }

  try {
    const estabelecimentos = await buscarTodasAsPaginas(nicho, localidade);
    const semSite = estabelecimentos.filter((e: any) => !e.websiteUri && e.nationalPhoneNumber);

    for (const e of semSite) {
      await pool.query(
        `insert into leads
          (usuario_id, nome, endereco, telefone, avaliacao, total_avaliacoes, categoria,
           status_negocio, horario_funcionamento, google_maps_url, latitude, longitude, nicho, localidade)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          sessao.usuarioId,
          e.displayName?.text ?? 'Sem nome',
          e.formattedAddress ?? '',
          e.nationalPhoneNumber,
          e.rating ?? null,
          e.userRatingCount ?? null,
          e.primaryTypeDisplayName?.text ?? nicho,
          e.businessStatus ?? null,
          formatarHorario(e.regularOpeningHours),
          e.googleMapsUri ?? null,
          e.location?.latitude ?? null,
          e.location?.longitude ?? null,
          nicho,
          localidade,
        ]
      );
    }

    // Registra no histórico de buscas
    await pool.query(
      'insert into historico_buscas (usuario_id, nicho, localidade, total) values ($1, $2, $3, $4)',
      [sessao.usuarioId, nicho, localidade, semSite.length]
    );

    return NextResponse.json({ total: semSite.length, totalEncontrado: estabelecimentos.length });
  } catch (erro: any) {
    console.error('Erro na busca:', erro?.response?.data || erro.message);
    return NextResponse.json({ erro: 'Falha ao buscar leads' }, { status: 500 });
  }
}
