// Verifica se o usuário da sessão é administrador
import { pool } from './db';
import { usuarioDaSessao } from './auth';

export async function exigirAdmin() {
  const sessao = await usuarioDaSessao();
  if (!sessao) return null;
  const resultado = await pool.query('select is_admin from usuarios where id = $1', [sessao.usuarioId]);
  if (resultado.rowCount === 0 || !resultado.rows[0].is_admin) return null;
  return sessao;
}
