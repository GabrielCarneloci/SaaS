'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MolduraAcesso } from '@/components/Moldura';
import { Botao, Campo, Aviso, Skeleton } from '@/components/ui';
import { MedidorSenha } from '@/components/MedidorSenha';

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

  if (!token) return <Aviso tom="erro">Link inválido.</Aviso>;

  if (sucesso) {
    return <Aviso tom="ok">Senha redefinida. Levando você para o login…</Aviso>;
  }

  return (
    <>
      <div className="space-y-3.5">
        <div>
          <Campo
            id="nova"
            rotulo="Nova senha"
            type="password"
            autoComplete="new-password"
            placeholder="Pelo menos 6 caracteres"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <MedidorSenha senha={senha} />
        </div>
        <Campo
          id="confirma"
          rotulo="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          placeholder="Repita a senha"
          value={confirma}
          onChange={(e) => setConfirma(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && salvar()}
          erro={confirma && senha !== confirma ? 'As senhas não coincidem' : undefined}
        />
      </div>

      {erro && <div className="mt-4"><Aviso tom="erro">{erro}</Aviso></div>}

      <div className="mt-5">
        <Botao variante="principal" tamanho="g" bloco carregando={carregando} onClick={salvar}>
          Redefinir senha
        </Botao>
      </div>
    </>
  );
}

export default function RedefinirSenha() {
  return (
    <MolduraAcesso>
      <h1 className="t-secao mb-1">Nova senha</h1>
      <p className="t-corpo mb-5">Escolha uma senha que você não use em outros sites.</p>
      <Suspense fallback={<Skeleton altura={80} />}>
        <Formulario />
      </Suspense>
    </MolduraAcesso>
  );
}
