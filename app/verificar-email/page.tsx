'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function Conteudo() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState<'carregando' | 'sucesso' | 'erro'>('carregando');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('erro');
      setErro('Link inválido.');
      return;
    }
    fetch('/api/auth/verificar-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.erro);
        setStatus('sucesso');
      })
      .catch((e) => {
        setStatus('erro');
        setErro(e.message || 'Falha ao confirmar e-mail');
      });
  }, [token]);

  if (status === 'carregando') return <p className="text-sm" style={{ color: 'var(--ink-2)' }}>Confirmando…</p>;

  if (status === 'sucesso') {
    return (
      <>
        <div className="px-4 py-3 rounded-lg text-sm mb-5" style={{ background: 'var(--ok-wash)', color: 'var(--ok)' }}>
          E-mail confirmado com sucesso!
        </div>
        <a href="/dashboard" className="acao block text-center" style={{ textDecoration: 'none' }}>Ir para o painel</a>
      </>
    );
  }

  return (
    <div className="px-4 py-3 rounded-lg text-sm" style={{ background: 'var(--perigo-wash)', color: 'var(--perigo)' }}>
      {erro}
    </div>
  );
}

export default function VerificarEmail() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--canvas)' }}>
      <div className="w-full max-w-sm p-8 rounded-2xl card">
        <h1 className="destaque text-[20px] mb-4" style={{ color: 'var(--ink)' }}>Confirmação de e-mail</h1>
        <Suspense fallback={<p className="text-sm">Carregando…</p>}>
          <Conteudo />
        </Suspense>
      </div>
    </div>
  );
}
