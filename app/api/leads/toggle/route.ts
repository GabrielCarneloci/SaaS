// Alterna o status "contatado" de um lead
import { NextRequest, NextResponse } from 'next/server';
import { alternarContatado } from '@/lib/localStorage';

export async function POST(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 });
  const leads = alternarContatado(id);
  return NextResponse.json({ leads });
}
