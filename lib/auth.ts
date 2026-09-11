// Autenticação: senha, sessão em banco de dados. As funções de JWT "puras"
// (sem acesso a banco) ficam em lib/jwt.ts, para não quebrar o middleware (edge).
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { pool } from './db';
import { gerarToken, verificarToken, NOME_COOKIE_SESSAO } from './jwt';

export async function gerarHash(senha: string) {
  return bcrypt.hash(senha, 10);
}

export async function conferirSenha(senha: string, hash: string) {
  return bcrypt.compare(senha, hash);
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
  cookieStore.set(NOME_COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    ...(lembrarDeMim ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });

  return sessaoId;
}

// Lê o usuário logado, checando se a sessão ainda é válida (não revogada)
export async function usuarioDaSessao() {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOME_COOKIE_SESSAO)?.value;
  if (!token) return null;

  const payload = await verificarToken(token);
  if (!payload) return null;

  const resultado = await pool.query(
    'select revogada from sessoes where id = $1 and usuario_id = $2',
    [payload.sessaoId, payload.usuarioId]
  );
  if (resultado.rowCount === 0 || resultado.rows[0].revogada) return null;

  pool.query('update sessoes set ultimo_uso = now() where id = $1', [payload.sessaoId]).catch(() => {});

  return payload;
}

export async function encerrarSessaoAtual() {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOME_COOKIE_SESSAO)?.value;
  if (token) {
    const payload = await verificarToken(token);
    if (payload) {
      await pool.query('update sessoes set revogada = true where id = $1', [payload.sessaoId]);
    }
  }
  cookieStore.delete(NOME_COOKIE_SESSAO);
}

export async function registrarAtividade(usuarioId: number, tipo: string, ip: string, detalhe?: string) {
  await pool.query(
    'insert into log_atividades (usuario_id, tipo, detalhe, ip) values ($1, $2, $3, $4)',
    [usuarioId, tipo, detalhe ?? null, ip]
  );
}

export { NOME_COOKIE_SESSAO };
