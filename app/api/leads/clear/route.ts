// Apaga todos os leads
import { NextResponse } from 'next/server';
import { limparLeads } from '@/lib/localStorage';

export async function POST() {
  limparLeads();
  return NextResponse.json({ ok: true });
}
