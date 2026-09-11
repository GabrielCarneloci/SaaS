'use client';
// Invólucro visual das telas internas (conta, administração).
// Dá a mesma barra de navegação e o mesmo enquadramento a todas elas.
import { type ReactNode } from 'react';
import { useTema } from './useTema';
import { Botao } from './ui';
import { IconePainel, IconeConta, IconeEscudo, IconeLua, IconeSol, IconeVoltar } from './Icones';

export function Moldura({
  paginaAtiva,
  ehAdmin,
  children,
  larguraMaxima = '48rem',
}: {
  paginaAtiva: 'conta' | 'admin';
  ehAdmin?: boolean;
  children: ReactNode;
  larguraMaxima?: string;
}) {
  const { tema, alternarTema } = useTema();

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--canvas)' }}>
      {/* barra superior */}
      <header
        className="sticky top-0 z-30"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}
      >
        <div className="max-w-[68rem] mx-auto px-4 sm:px-6 h-14 flex items-center gap-2">
          <a href="/dashboard" className="btn btn-fantasma btn-p mr-1" aria-label="Voltar ao painel">
            <IconeVoltar tamanho={15} />
            <span className="hidden sm:inline">Painel</span>
          </a>

          <div className="w-px h-5 shrink-0" style={{ background: 'var(--line)' }} />

          <nav className="flex items-center gap-1 min-w-0" aria-label="Seções da conta">
            <a href="/perfil" className="nav-item" data-ativo={paginaAtiva === 'conta' ? '1' : undefined} style={{ width: 'auto' }}>
              <IconeConta tamanho={15} />
              <span>Sua conta</span>
            </a>
            {ehAdmin && (
              <a href="/admin" className="nav-item" data-ativo={paginaAtiva === 'admin' ? '1' : undefined} style={{ width: 'auto' }}>
                <IconeEscudo tamanho={15} />
                <span>Administração</span>
              </a>
            )}
          </nav>

          <div className="ml-auto">
            <Botao
              variante="fantasma"
              className="btn-icone"
              onClick={alternarTema}
              aria-label={tema === 'claro' ? 'Usar tema escuro' : 'Usar tema claro'}
              title={tema === 'claro' ? 'Usar tema escuro' : 'Usar tema claro'}
            >
              {tema === 'claro' ? <IconeLua tamanho={15} /> : <IconeSol tamanho={15} />}
            </Botao>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-7 mx-auto" style={{ maxWidth: larguraMaxima }}>
        {children}
      </main>
    </div>
  );
}

/* Enquadramento das telas de entrada (login, cadastro, recuperação) */
export function MolduraAcesso({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
      style={{ background: 'var(--canvas)' }}
    >
      <div className="w-full max-w-[23rem]">
        <a href="/" className="flex items-center gap-2 mb-6 no-underline">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--marca-1)' }}
          >
            <IconePainel tamanho={16} style={{ color: '#fff' }} />
          </div>
          <span className="t-secao" style={{ color: 'var(--ink)' }}>Radar de Leads</span>
        </a>
        <div className="cartao p-6" style={{ boxShadow: 'var(--s2)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
