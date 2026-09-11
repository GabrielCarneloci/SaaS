'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MolduraAcesso } from '@/components/Moldura';
import { Botao, Campo, Aviso } from '@/components/ui';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(true);
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
        body: JSON.stringify({ email, senha, lembrar }),
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
    <MolduraAcesso>
      <h1 className="t-secao mb-1">Entrar na sua conta</h1>
      <p className="t-corpo mb-5">Acesse os leads que você já encontrou.</p>

      <div className="space-y-3.5">
        <Campo
          id="email"
          rotulo="E-mail"
          type="email"
          autoComplete="username"
          placeholder="voce@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Campo
          id="senha"
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          placeholder="Sua senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && entrar()}
        />
      </div>

      <label className="flex items-center gap-2 mt-3.5 mb-4 t-apoio cursor-pointer select-none">
        <input
          type="checkbox"
          checked={lembrar}
          onChange={(e) => setLembrar(e.target.checked)}
          style={{ accentColor: 'var(--marca-1)', width: 15, height: 15 }}
        />
        Continuar conectado neste dispositivo
      </label>

      {erro && (
        <div className="mb-4">
          <Aviso tom="erro">
            {erro}
            {precisaReset && (
              <a href="/esqueci-senha" className="block mt-1 font-semibold underline">
                Redefinir senha por e-mail
              </a>
            )}
          </Aviso>
        </div>
      )}

      <Botao variante="principal" tamanho="g" bloco carregando={carregando} onClick={entrar}>
        Entrar
      </Botao>

      <hr className="divisor my-5" />

      <div className="flex items-center justify-between t-apoio">
        <a href="/esqueci-senha" style={{ color: 'var(--ink-2)' }}>Esqueci a senha</a>
        <a href="/cadastro" style={{ color: 'var(--marca-1)', fontWeight: 500 }}>Criar conta</a>
      </div>
    </MolduraAcesso>
  );
}
