// Lista os leads salvos
import { NextResponse } from 'next/server';
import { lerLeads } from '@/lib/localStorage';

export async function GET() {
  const leads = lerLeads();
  return NextResponse.json({ leads });
}
