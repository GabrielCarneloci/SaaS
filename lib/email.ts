// Envio de e-mails via Resend. Configure RESEND_API_KEY e EMAIL_REMETENTE no .env
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const REMETENTE = process.env.EMAIL_REMETENTE || 'Radar de Leads <onboarding@resend.dev>';

export async function enviarEmailReset(destino: string, linkReset: string) {
  await resend.emails.send({
    from: REMETENTE,
    to: destino,
    subject: 'Redefinição de senha — Radar de Leads',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111;">Redefinir sua senha</h2>
        <p style="color: #444; line-height: 1.6;">
          Recebemos um pedido para redefinir a senha da sua conta.
          Clique no botão abaixo para criar uma nova senha. O link expira em 1 hora.
        </p>
        <a href="${linkReset}"
           style="display: inline-block; background: #111; color: #fff; text-decoration: none;
                  padding: 12px 24px; border-radius: 8px; margin: 16px 0; font-weight: 600;">
          Redefinir senha
        </a>
        <p style="color: #888; font-size: 13px; line-height: 1.6;">
          Se você não pediu isso, pode ignorar este e-mail com segurança — sua senha não será alterada.
        </p>
      </div>
    `,
  });
}

export async function enviarEmailVerificacao(destino: string, link: string) {
  await resend.emails.send({
    from: REMETENTE,
    to: destino,
    subject: 'Confirme seu e-mail — Radar de Leads',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111;">Confirme seu e-mail</h2>
        <p style="color: #444; line-height: 1.6;">
          Falta pouco para começar a usar o Radar de Leads. Clique no botão abaixo para
          confirmar seu e-mail e liberar sua conta. O link expira em 24 horas.
        </p>
        <a href="${link}"
           style="display: inline-block; background: #635bff; color: #fff; text-decoration: none;
                  padding: 12px 24px; border-radius: 8px; margin: 16px 0; font-weight: 600;">
          Confirmar e-mail
        </a>
        <p style="color: #888; font-size: 13px;">Se você não criou essa conta, pode ignorar este e-mail.</p>
      </div>
    `,
  });
}

export async function enviarEmailConfirmarExclusao(destino: string, link: string) {
  await resend.emails.send({
    from: REMETENTE,
    to: destino,
    subject: 'Confirme a exclusão da sua conta — Radar de Leads',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111;">Excluir sua conta?</h2>
        <p style="color: #444; line-height: 1.6;">
          Recebemos um pedido para excluir permanentemente sua conta e todos os leads salvos.
          Essa ação não pode ser desfeita. Se foi você, confirme abaixo. O link expira em 1 hora.
        </p>
        <a href="${link}"
           style="display: inline-block; background: #ef4444; color: #fff; text-decoration: none;
                  padding: 12px 24px; border-radius: 8px; margin: 16px 0; font-weight: 600;">
          Confirmar exclusão da conta
        </a>
        <p style="color: #888; font-size: 13px;">Se você não pediu isso, ignore este e-mail — nada será apagado.</p>
      </div>
    `,
  });
}
