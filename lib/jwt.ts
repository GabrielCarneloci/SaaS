// Funções de JWT "puras" (sem acesso a banco), seguras para rodar no middleware
// (ambiente edge, que não suporta o driver do Postgres). Não importe 'pg' aqui.
import { SignJWT, jwtVerify } from 'jose';

const SEGREDO = new TextEncoder().encode(
  process.env.JWT_SECRET || 'troque-este-segredo-em-producao'
);

export const NOME_COOKIE_SESSAO = 'sessao';

export async function gerarToken(usuarioId: number, sessaoId: number) {
  return new SignJWT({ usuarioId, sessaoId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(SEGREDO);
}

export async function verificarToken(token: string): Promise<{ usuarioId: number; sessaoId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, SEGREDO);
    return { usuarioId: payload.usuarioId as number, sessaoId: payload.sessaoId as number };
  } catch {
    return null;
  }
}

// Usado só no middleware: confirma que o token tem assinatura válida (sem tocar no banco)
export async function tokenEhValido(token: string): Promise<boolean> {
  return (await verificarToken(token)) !== null;
}
