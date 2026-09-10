'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [precisaReset, setPrecisaReset] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    setErro('');
    setPrecisaReset(false);
    setCarregando(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.precisaReset) setPrecisaReset(true);
        throw new Error(data.erro);
      }
      router.push('/dashboard');
      router.refresh();
    } catch (e: any) {
      setErro(e.message || 'Falha ao entrar');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative" style={{ background: 'var(--canvas)' }}>
      <div className="absolute inset-0 papel pointer-events-none" />
      <div className="w-full max-w-sm p-8 rounded-2xl relative card">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>R</span>
          </div>
          <span className="font-semibold" style={{ color: 'var(--ink)' }}>Radar de Leads</span>
        </div>

        <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--ink)' }}>Bem-vindo de volta</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-2)' }}>Entre para acessar seus leads</p>

        <input className="campo mb-3" placeholder="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="campo mb-4" placeholder="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && entrar()} />

        {erro && (
          <div className="mb-4 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--danger-wash)', color: 'var(--danger)' }}>
            {erro}
            {precisaReset && (
              <a href="/esqueci-senha" className="block mt-1 font-semibold underline">Redefinir senha por e-mail →</a>
            )}
          </div>
        )}

        <button onClick={entrar} disabled={carregando} className="acao">
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>

        <div className="flex items-center justify-between mt-5 text-sm">
          <a href="/esqueci-senha" style={{ color: 'var(--ink-2)' }}>Esqueci a senha</a>
          <a href="/cadastro" style={{ color: 'var(--accent)', fontWeight: 500 }}>Criar conta</a>
        </div>
      </div>
    </div>
  );
}
