// Encerra a sessão atual (revoga no banco e limpa o cookie)
import { NextResponse } from 'next/server';
import { encerrarSessaoAtual } from '@/lib/auth';

export async function POST() {
  await encerrarSessaoAtual();
  return NextResponse.json({ ok: true });
}
