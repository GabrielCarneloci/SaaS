// Cria uma assinatura recorrente no Mercado Pago e retorna o link de pagamento
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { pool } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/auth';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export async function POST() {
  const sessao = await usuarioDaSessao();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const resultado = await pool.query('select email from usuarios where id = $1', [sessao.usuarioId]);
  if (resultado.rowCount === 0) {
    return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });
  }
  const email = resultado.rows[0].email;

  try {
    const preapproval = new PreApproval(client);
    const assinatura = await preapproval.create({
      body: {
        reason: 'Radar de Leads — assinatura mensal',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: Number(process.env.PRECO_ASSINATURA || '49.90'),
          currency_id: 'BRL',
        },
        back_url: `${process.env.APP_URL}/dashboard`,
        payer_email: email,
        external_reference: String(sessao.usuarioId),
        status: 'pending',
      },
    });

    await pool.query('update usuarios set mp_preapproval_id = $1 where id = $2', [
      assinatura.id,
      sessao.usuarioId,
    ]);

    return NextResponse.json({ linkPagamento: assinatura.init_point });
  } catch (erro: any) {
    console.error('Erro ao criar assinatura:', erro?.message || erro);
    return NextResponse.json({ erro: 'Falha ao criar assinatura' }, { status: 500 });
  }
}
