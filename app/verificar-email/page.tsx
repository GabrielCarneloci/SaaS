'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MolduraAcesso } from '@/components/Moldura';
import { Botao, Aviso, Skeleton } from '@/components/ui';

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

  if (status === 'carregando') {
    return (
      <>
        <Skeleton altura={16} largura="60%" />
        <div className="h-2" />
        <Skeleton altura={16} largura="40%" />
      </>
    );
  }

  if (status === 'sucesso') {
    return (
      <>
        <Aviso tom="ok">E-mail confirmado. Sua conta está liberada.</Aviso>
        <div className="mt-5">
          <a href="/dashboard" className="btn btn-principal btn-g btn-bloco">Ir para o painel</a>
        </div>
      </>
    );
  }

  return (
    <>
      <Aviso tom="erro">{erro}</Aviso>
      <div className="mt-5">
        <a href="/verifique-seu-email" className="btn btn-secundario btn-g btn-bloco">Pedir um novo link</a>
      </div>
    </>
  );
}

export default function VerificarEmail() {
  return (
    <MolduraAcesso>
      <h1 className="t-secao mb-1">Confirmação de e-mail</h1>
      <p className="t-corpo mb-5">Estamos validando o link que você abriu.</p>
      <Suspense fallback={<Skeleton altura={60} />}>
        <Conteudo />
      </Suspense>
    </MolduraAcesso>
  );
}
