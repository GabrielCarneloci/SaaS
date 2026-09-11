'use client';
// Indicador visual da força da senha. Calcula apenas no navegador,
// sem enviar a senha para lugar nenhum.

export function forcaSenha(senha: string): { nivel: number; rotulo: string; cor: string } {
  if (!senha) return { nivel: 0, rotulo: '', cor: 'var(--line-2)' };
  let pontos = 0;
  if (senha.length >= 8) pontos++;
  if (senha.length >= 12) pontos++;
  if (/[A-Z]/.test(senha) && /[a-z]/.test(senha)) pontos++;
  if (/[0-9]/.test(senha)) pontos++;
  if (/[^A-Za-z0-9]/.test(senha)) pontos++;

  if (pontos <= 1) return { nivel: 1, rotulo: 'Fraca', cor: 'var(--perigo)' };
  if (pontos <= 3) return { nivel: 2, rotulo: 'Média', cor: 'var(--alerta)' };
  return { nivel: 3, rotulo: 'Forte', cor: 'var(--ok)' };
}

export function MedidorSenha({ senha }: { senha: string }) {
  const forca = forcaSenha(senha);
  if (!senha) return null;
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{ background: n <= forca.nivel ? forca.cor : 'var(--surface-3)' }}
          />
        ))}
      </div>
      <span className="t-nota shrink-0" style={{ color: forca.cor, fontWeight: 500 }}>{forca.rotulo}</span>
    </div>
  );
}
