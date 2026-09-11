'use client';
import { useState } from 'react';

export default function VerifiqueSeuEmail() {
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState('');

  async function reenviar() {
    setEnviando(true);
    setMsg('');
    try {
      const res = await fetch('/api/auth/reenviar-verificacao', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro);
      setMsg(data.jaVerificado ? 'Seu e-mail já está verificado — recarregue a página.' : 'E-mail reenviado. Confira sua caixa de entrada.');
    } catch (e: any) {
      setMsg(e.message || 'Não foi possível reenviar agora.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--canvas)' }}>
      <div className="w-full max-w-sm p-8 rounded-2xl card text-center">
        <div className="text-4xl mb-3">📬</div>
        <h1 className="destaque text-[19px] mb-2" style={{ color: 'var(--ink)' }}>Confirme seu e-mail</h1>
        <p className="text-[13.5px] mb-6 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          Enviamos um link de confirmação para o seu e-mail. Clique nele para liberar o acesso ao painel.
        </p>
        {msg && (
          <p className="text-[12.5px] mb-4 px-3 py-2 rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            {msg}
          </p>
        )}
        <button onClick={reenviar} disabled={enviando} className="acao mb-3">
          {enviando ? 'Enviando…' : 'Reenviar e-mail'}
        </button>
        <a href="/login" className="block text-[13px]" style={{ color: 'var(--ink-2)' }}>Sair e tentar com outra conta</a>
      </div>
    </div>
  );
}
