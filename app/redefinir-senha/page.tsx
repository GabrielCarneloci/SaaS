'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function Formulario() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function salvar() {
    setErro('');
    if (senha.length < 6) return setErro('A senha precisa de pelo menos 6 caracteres');
    if (senha !== confirma) return setErro('As senhas não coincidem');
    setCarregando(true);
    try {
      const res = await fetch('/api/auth/confirmar-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha: senha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro);
      setSucesso(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (e: any) {
      setErro(e.message || 'Falha ao redefinir');
    } finally {
      setCarregando(false);
    }
  }

  if (!token) {
    return <p className="text-sm" style={{ color: 'var(--danger)' }}>Link inválido.</p>;
  }

  if (sucesso) {
    return (
      <div className="px-4 py-3 rounded-lg text-sm" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
        Senha redefinida com sucesso! Redirecionando para o login…
      </div>
    );
  }

  return (
    <>
      <input className="input-radar mb-3" placeholder="Nova senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
      <input className="input-radar mb-4" placeholder="Confirmar nova senha" type="password" value={confirma}
        onChange={(e) => setConfirma(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && salvar()} />
      {erro && <p className="text-xs mb-4" style={{ color: 'var(--danger)' }}>{erro}</p>}
      <button onClick={salvar} disabled={carregando} className="btn-primario">
        {carregando ? 'Salvando…' : 'Redefinir senha'}
      </button>
    </>
  );
}

export default function RedefinirSenha() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative" style={{ background: 'var(--bg)' }}>
      <div className="absolute inset-0 dot-grid pointer-events-none" />
      <div className="w-full max-w-sm p-8 rounded-2xl relative card">
        <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--text)' }}>Nova senha</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-dim)' }}>Escolha uma senha forte para sua conta.</p>
        <Suspense fallback={<p className="text-sm" style={{ color: 'var(--text-dim)' }}>Carregando…</p>}>
          <Formulario />
        </Suspense>
      </div>
    </div>
  );
}
