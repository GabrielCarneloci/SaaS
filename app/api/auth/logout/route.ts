// Encerra a sessão
import { NextResponse } from 'next/server';
import { NOME_COOKIE_SESSAO } from '@/lib/auth';

export async function POST() {
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.delete(NOME_COOKIE_SESSAO);
  return resposta;
}
