'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Cadastro() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

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
      router.push('/dashboard');
      router.refresh();
    } catch (e: any) {
      setErro(e.message || 'Falha ao cadastrar');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm p-8 rounded-xl" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
        <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>Criar conta</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-dim)' }}>Comece a buscar leads em minutos</p>

        <input
          className="input-radar mb-3"
          placeholder="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input-radar mb-4"
          placeholder="Senha (mín. 6 caracteres)"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && cadastrar()}
        />

        {erro && <p className="text-xs mb-4" style={{ color: 'var(--danger)' }}>{erro}</p>}

        <button
          onClick={cadastrar}
          disabled={carregando}
          className="w-full py-3 rounded-lg text-sm font-semibold disabled:opacity-60"
          style={{ background: 'var(--accent)', color: '#04120a' }}
        >
          {carregando ? 'Criando…' : 'Criar conta'}
        </button>

        <p className="text-sm text-center mt-5" style={{ color: 'var(--text-dim)' }}>
          Já tem conta?{' '}
          <a href="/login" style={{ color: 'var(--accent)' }}>Entrar</a>
        </p>
      </div>
    </div>
  );
}
