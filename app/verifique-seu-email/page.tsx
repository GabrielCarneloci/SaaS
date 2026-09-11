'use client';
import { useState } from 'react';
import { MolduraAcesso } from '@/components/Moldura';
import { Botao, Aviso } from '@/components/ui';

export default function VerifiqueSeuEmail() {
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState('');
  const [tom, setTom] = useState<'ok' | 'erro'>('ok');

  async function reenviar() {
    setEnviando(true);
    setMsg('');
    try {
      const res = await fetch('/api/auth/reenviar-verificacao', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro);
      setTom('ok');
      setMsg(data.jaVerificado
        ? 'Seu e-mail já está confirmado. Recarregue a página.'
        : 'E-mail reenviado. Confira sua caixa de entrada.');
    } catch (e: any) {
      setTom('erro');
      setMsg(e.message || 'Não foi possível reenviar agora.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <MolduraAcesso>
      <h1 className="t-secao mb-1">Confirme seu e-mail</h1>
      <p className="t-corpo mb-5 leading-relaxed">
        Enviamos um link de confirmação para o endereço que você cadastrou.
        Depois de clicar nele, o painel fica liberado.
      </p>

      {msg && <div className="mb-4"><Aviso tom={tom}>{msg}</Aviso></div>}

      <Botao variante="principal" tamanho="g" bloco carregando={enviando} onClick={reenviar}>
        Reenviar e-mail
      </Botao>

      <hr className="divisor my-5" />

      <p className="t-apoio text-center">
        <a href="/login" style={{ color: 'var(--ink-2)' }}>Entrar com outra conta</a>
      </p>
    </MolduraAcesso>
  );
}
