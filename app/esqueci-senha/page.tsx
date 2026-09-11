'use client';
import { useState } from 'react';
import { MolduraAcesso } from '@/components/Moldura';
import { Botao, Campo, Aviso } from '@/components/ui';

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
      setEnviado(true);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <MolduraAcesso>
      <h1 className="t-secao mb-1">Redefinir senha</h1>
      <p className="t-corpo mb-5">Enviamos um link de redefinição para o seu e-mail.</p>

      {enviado ? (
        <Aviso tom="ok">
          Se este e-mail estiver cadastrado, o link chega em instantes. Verifique também a caixa de spam.
        </Aviso>
      ) : (
        <>
          <Campo
            id="email"
            rotulo="E-mail da conta"
            type="email"
            autoComplete="username"
            placeholder="voce@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && email && enviar()}
          />
          <div className="mt-5">
            <Botao variante="principal" tamanho="g" bloco carregando={carregando} disabled={!email} onClick={enviar}>
              Enviar link
            </Botao>
          </div>
        </>
      )}

      <hr className="divisor my-5" />

      <p className="t-apoio text-center">
        <a href="/login" style={{ color: 'var(--marca-1)' }}>Voltar ao login</a>
      </p>
    </MolduraAcesso>
  );
}
