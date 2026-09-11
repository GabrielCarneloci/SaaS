// Autenticação: senha, token de sessão em cookie, e sessões controladas no banco
// (isso permite listar e revogar sessões, algo que um JWT puro não permite)
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { pool } from './db';

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

async function gerarToken(usuarioId: number, sessaoId: number) {
  return new SignJWT({ usuarioId, sessaoId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(SEGREDO);
}

async function verificarToken(token: string): Promise<{ usuarioId: number; sessaoId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, SEGREDO);
    return { usuarioId: payload.usuarioId as number, sessaoId: payload.sessaoId as number };
  } catch {
    return null;
  }
}

// Cria uma sessão no banco + cookie. Use no login e no cadastro.
export async function criarSessao(
  usuarioId: number,
  ip: string,
  userAgent: string,
  lembrarDeMim: boolean
) {
  const resultado = await pool.query(
    'insert into sessoes (usuario_id, ip, user_agent) values ($1, $2, $3) returning id',
    [usuarioId, ip, userAgent]
  );
  const sessaoId = resultado.rows[0].id;
  const token = await gerarToken(usuarioId, sessaoId);

  const cookieStore = await cookies();
  cookieStore.set(NOME_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    // "lembrar de mim" = cookie persiste 30 dias; senão, expira ao fechar o navegador
    ...(lembrarDeMim ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });

  return sessaoId;
}

// Lê o usuário logado, checando se a sessão ainda é válida (não revogada)
export async function usuarioDaSessao() {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOME_COOKIE)?.value;
  if (!token) return null;

  const payload = await verificarToken(token);
  if (!payload) return null;

  const resultado = await pool.query(
    'select revogada from sessoes where id = $1 and usuario_id = $2',
    [payload.sessaoId, payload.usuarioId]
  );
  if (resultado.rowCount === 0 || resultado.rows[0].revogada) return null;

  // atualiza o "último uso" sem bloquear a resposta
  pool.query('update sessoes set ultimo_uso = now() where id = $1', [payload.sessaoId]).catch(() => {});

  return payload;
}

export async function encerrarSessaoAtual() {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOME_COOKIE)?.value;
  if (token) {
    const payload = await verificarToken(token);
    if (payload) {
      await pool.query('update sessoes set revogada = true where id = $1', [payload.sessaoId]);
    }
  }
  cookieStore.delete(NOME_COOKIE);
}

export async function registrarAtividade(usuarioId: number, tipo: string, ip: string, detalhe?: string) {
  await pool.query(
    'insert into log_atividades (usuario_id, tipo, detalhe, ip) values ($1, $2, $3, $4)',
    [usuarioId, tipo, detalhe ?? null, ip]
  );
}

// Verificação leve de token, sem tocar no banco — usada só no middleware (roda em edge)
export async function tokenEhValido(token: string): Promise<boolean> {
  return (await verificarToken(token)) !== null;
}

export const NOME_COOKIE_SESSAO = NOME_COOKIE;
