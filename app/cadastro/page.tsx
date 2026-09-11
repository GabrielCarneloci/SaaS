'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MolduraAcesso } from '@/components/Moldura';
import { Botao, Campo, Aviso } from '@/components/ui';
import { MedidorSenha } from '@/components/MedidorSenha';

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
      router.push('/verifique-seu-email');
      router.refresh();
    } catch (e: any) {
      setErro(e.message || 'Falha ao cadastrar');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <MolduraAcesso>
      <h1 className="t-secao mb-1">Criar uma conta</h1>
      <p className="t-corpo mb-5">Leva menos de um minuto e não custa nada.</p>

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
        <div>
          <Campo
            id="senha"
            rotulo="Senha"
            type="password"
            autoComplete="new-password"
            placeholder="Pelo menos 6 caracteres"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && cadastrar()}
          />
          <MedidorSenha senha={senha} />
        </div>
      </div>

      {erro && <div className="mt-4"><Aviso tom="erro">{erro}</Aviso></div>}

      <div className="mt-5">
        <Botao variante="principal" tamanho="g" bloco carregando={carregando} onClick={cadastrar}>
          Criar conta
        </Botao>
      </div>

      <p className="t-nota text-center mt-3 leading-relaxed">
        Você receberá um e-mail para confirmar o endereço.
      </p>

      <hr className="divisor my-5" />

      <p className="t-apoio text-center">
        Já tem conta? <a href="/login" style={{ color: 'var(--marca-1)', fontWeight: 500 }}>Entrar</a>
      </p>
    </MolduraAcesso>
  );
}
