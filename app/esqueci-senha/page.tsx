'use client';
import { useState } from 'react';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    setCarregando(true);
    try {
      await fetch('/api/auth/pedir-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setEnviado(true);
    } catch {
      setEnviado(true); // resposta genérica sempre
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative" style={{ background: 'var(--bg)' }}>
      <div className="absolute inset-0 dot-grid pointer-events-none" />
      <div className="w-full max-w-sm p-8 rounded-2xl relative card">
        <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--text)' }}>Redefinir senha</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-dim)' }}>
          Enviaremos um link de redefinição para o seu e-mail.
        </p>

        {enviado ? (
          <div className="px-4 py-3 rounded-lg text-sm" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
            Se este e-mail estiver cadastrado, você receberá um link em instantes. Verifique sua caixa de entrada e spam.
          </div>
        ) : (
          <>
            <input className="input-radar mb-4" placeholder="Seu e-mail" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && enviar()} />
            <button onClick={enviar} disabled={carregando || !email} className="btn-primario">
              {carregando ? 'Enviando…' : 'Enviar link'}
            </button>
          </>
        )}

        <p className="text-sm text-center mt-5">
          <a href="/login" style={{ color: 'var(--accent)' }}>← Voltar ao login</a>
        </p>
      </div>
    </div>
  );
}
