// Funções auxiliares de autenticação: senha e token de sessão (JWT em cookie)
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SEGREDO = new TextEncoder().encode(
  process.env.JWT_SECRET || 'troque-este-segredo-em-producao'
);
const NOME_COOKIE = 'sessao';

export async function gerarHash(senha: string) {
  return bcrypt.hash(senha, 10);
}

export async function conferirSenha(senha: string, hash: string) {
  return bcrypt.compare(senha, hash);
}

export async function gerarToken(usuarioId: number) {
  return new SignJWT({ usuarioId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(SEGREDO);
}

export async function verificarToken(token: string): Promise<{ usuarioId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, SEGREDO);
    return { usuarioId: payload.usuarioId as number };
  } catch {
    return null;
  }
}

// Lê o usuário logado a partir do cookie (uso em Server Components / Route Handlers)
export async function usuarioDaSessao() {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOME_COOKIE)?.value;
  if (!token) return null;
  return verificarToken(token);
}

export const NOME_COOKIE_SESSAO = NOME_COOKIE;
