// Recebe notificações do Mercado Pago sobre mudanças na assinatura
import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { pool } from '@/lib/db';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export async function POST(req: NextRequest) {
  try {
    const corpo = await req.json();

    // O Mercado Pago envia diferentes formatos; tratamos o de preapproval
    const preapprovalId = corpo?.data?.id || corpo?.id;
    if (!preapprovalId) return NextResponse.json({ ok: true });

    const preapproval = new PreApproval(client);
    const detalhes = await preapproval.get({ id: preapprovalId });

    const usuarioId = Number(detalhes.external_reference);
    if (!usuarioId) return NextResponse.json({ ok: true });

    const status = detalhes.status === 'authorized' ? 'ativa' : 'inativa';

    await pool.query(
      'update usuarios set status_assinatura = $1, mp_preapproval_id = $2 where id = $3',
      [status, preapprovalId, usuarioId]
    );

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error('Erro no webhook:', erro);
    return NextResponse.json({ ok: true }); // sempre 200 pro MP não ficar reenviando
  }
}
