// Rate limiting simples com janela fixa, guardado no Postgres.
// Retorna { permitido, restante, resetaEm }.
import { pool } from './db';

export async function checarRateLimit(
  chave: string,
  limite: number,
  janelaSegundos: number
): Promise<{ permitido: boolean; restante: number; resetaEm: number }> {
  const agora = new Date();

  // Busca o registro atual
  const atual = await pool.query('select contador, janela_inicio from rate_limits where chave = $1', [chave]);

  if (atual.rowCount === 0) {
    await pool.query('insert into rate_limits (chave, contador, janela_inicio) values ($1, 1, $2)', [chave, agora]);
    return { permitido: true, restante: limite - 1, resetaEm: janelaSegundos };
  }

  const registro = atual.rows[0];
  const inicioJanela = new Date(registro.janela_inicio);
  const decorridoSeg = (agora.getTime() - inicioJanela.getTime()) / 1000;

  // Janela expirou → reinicia
  if (decorridoSeg >= janelaSegundos) {
    await pool.query('update rate_limits set contador = 1, janela_inicio = $2 where chave = $1', [chave, agora]);
    return { permitido: true, restante: limite - 1, resetaEm: janelaSegundos };
  }

  // Dentro da janela
  if (registro.contador >= limite) {
    return { permitido: false, restante: 0, resetaEm: Math.ceil(janelaSegundos - decorridoSeg) };
  }

  await pool.query('update rate_limits set contador = contador + 1 where chave = $1', [chave]);
  return { permitido: true, restante: limite - registro.contador - 1, resetaEm: Math.ceil(janelaSegundos - decorridoSeg) };
}

// Extrai o IP real do request (respeitando o proxy Nginx)
export function ipDoRequest(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'desconhecido';
}
