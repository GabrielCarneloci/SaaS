'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MolduraAcesso } from '@/components/Moldura';
import { Aviso, Skeleton } from '@/components/ui';

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
    fetch('/api/auth/confirmar-exclusao', {
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
        setErro(e.message || 'Falha ao excluir conta');
      });
  }, [token]);

  if (status === 'carregando') return <Skeleton altura={50} />;

  if (status === 'sucesso') {
    return (
      <>
        <Aviso tom="ok">Sua conta e os leads salvos foram apagados.</Aviso>
        <div className="mt-5">
          <a href="/" className="btn btn-secundario btn-g btn-bloco">Voltar ao início</a>
        </div>
      </>
    );
  }

  return <Aviso tom="erro">{erro}</Aviso>;
}

export default function ConfirmarExclusao() {
  return (
    <MolduraAcesso>
      <h1 className="t-secao mb-1">Exclusão de conta</h1>
      <p className="t-corpo mb-5">Processando o pedido enviado por e-mail.</p>
      <Suspense fallback={<Skeleton altura={50} />}>
        <Conteudo />
      </Suspense>
    </MolduraAcesso>
  );
}
