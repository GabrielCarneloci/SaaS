'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Assinatura() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [statusAtual, setStatusAtual] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/eu')
      .then((r) => r.json())
      .then((d) => {
        if (!d.usuario) return router.push('/login');
        setStatusAtual(d.usuario.status_assinatura);
        if (d.usuario.status_assinatura === 'ativa') router.push('/dashboard');
      });
  }, [router]);

  async function assinar() {
    setErro('');
    setCarregando(true);
    try {
      const res = await fetch('/api/pagamento/criar-assinatura', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro);
      window.location.href = data.linkPagamento;
    } catch (e: any) {
      setErro(e.message || 'Falha ao iniciar assinatura');
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md p-8 rounded-xl text-center" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
        <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>Ative sua assinatura</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-dim)' }}>
          Acesso completo ao Radar de Leads: busca ilimitada de empresas sem site.
        </p>

        <div className="text-4xl font-bold mb-1" style={{ color: 'var(--accent)' }}>
          R$ {process.env.NEXT_PUBLIC_PRECO_ASSINATURA || '49,90'}
        </div>
        <div className="text-xs mono mb-6" style={{ color: 'var(--text-faint)' }}>por mês · cancele quando quiser</div>

        {erro && <p className="text-xs mb-4" style={{ color: 'var(--danger)' }}>{erro}</p>}

        <button
          onClick={assinar}
          disabled={carregando}
          className="w-full py-3 rounded-lg text-sm font-semibold disabled:opacity-60"
          style={{ background: 'var(--accent)', color: '#04120a' }}
        >
          {carregando ? 'Redirecionando…' : 'Assinar com Mercado Pago'}
        </button>
      </div>
    </div>
  );
}
