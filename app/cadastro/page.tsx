'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

function forcaSenha(senha: string): { nivel: number; rotulo: string; cor: string } {
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

export default function Cadastro() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const forca = forcaSenha(senha);

  async function cadastrar() {
    setErro('');
    setCarregando(true);
    try {
      const res = await fetch('/api/auth/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro);
      router.push('/verifique-seu-email');
      router.refresh();
    } catch (e: any) {
      setErro(e.message || 'Falha ao cadastrar');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative" style={{ background: 'var(--canvas)' }}>
      <div className="w-full max-w-sm p-8 rounded-2xl relative card">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--grad-marca)' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>R</span>
          </div>
          <span className="destaque" style={{ color: 'var(--ink)' }}>Radar de Leads</span>
        </div>

        <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--ink)' }}>Criar conta grátis</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-2)' }}>Comece a encontrar leads em minutos</p>

        <input className="campo mb-3" placeholder="E-mail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />

        <input
          className="campo mb-1.5"
          placeholder="Senha (mín. 6 caracteres)"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && cadastrar()}
        />
        {senha && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${(forca.nivel / 3) * 100}%`, background: forca.cor }} />
            </div>
            <span className="text-[11.5px] font-medium shrink-0" style={{ color: forca.cor }}>{forca.rotulo}</span>
          </div>
        )}
        {!senha && <div className="mb-4" />}

        {erro && <p className="text-xs mb-4" style={{ color: 'var(--perigo)' }}>{erro}</p>}

        <button onClick={cadastrar} disabled={carregando} className="acao">
          {carregando ? 'Criando…' : 'Criar conta'}
        </button>

        <p className="text-[12px] text-center mt-3 leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          Você receberá um e-mail para confirmar sua conta.
        </p>

        <p className="text-sm text-center mt-4" style={{ color: 'var(--ink-2)' }}>
          Já tem conta? <a href="/login" style={{ color: 'var(--marca-1)', fontWeight: 500 }}>Entrar</a>
        </p>
      </div>
    </div>
  );
}
