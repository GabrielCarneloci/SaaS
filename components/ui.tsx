'use client';
// Primitivos visuais reutilizados em todas as telas.
// Componentes puramente de apresentação — nenhuma regra de negócio aqui.
import { useEffect, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { IconeFechar, IconeAlerta, IconeCheck } from './Icones';

/* ---------------- Botão ---------------- */

type VarianteBotao = 'principal' | 'secundario' | 'fantasma' | 'perigo' | 'perigo-leve';

export function Botao({
  variante = 'secundario',
  tamanho,
  bloco,
  carregando,
  ativo,
  className = '',
  children,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBotao;
  tamanho?: 'p' | 'g';
  bloco?: boolean;
  carregando?: boolean;
  ativo?: boolean;
}) {
  const classes = [
    'btn',
    `btn-${variante}`,
    tamanho ? `btn-${tamanho}` : '',
    bloco ? 'btn-bloco' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      data-carregando={carregando ? '1' : undefined}
      data-ativo={ativo ? '1' : undefined}
      disabled={resto.disabled || carregando}
      {...resto}
    >
      {children}
    </button>
  );
}

/* ---------------- Campo de texto ---------------- */

export function Campo({
  rotulo,
  erro,
  dica,
  sucesso,
  id,
  className = '',
  ...resto
}: InputHTMLAttributes<HTMLInputElement> & {
  rotulo?: string;
  erro?: string;
  dica?: string;
  sucesso?: string;
}) {
  return (
    <div>
      {rotulo && <label htmlFor={id} className="t-rotulo">{rotulo}</label>}
      <input
        id={id}
        className={`campo ${className}`}
        data-erro={erro ? '1' : undefined}
        data-ok={sucesso ? '1' : undefined}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro && id ? `${id}-erro` : undefined}
        {...resto}
      />
      {erro && <p id={id ? `${id}-erro` : undefined} className="msg msg-erro"><IconeAlerta tamanho={13} />{erro}</p>}
      {sucesso && !erro && <p className="msg msg-ok"><IconeCheck tamanho={13} />{sucesso}</p>}
      {dica && !erro && !sucesso && <p className="msg msg-dica">{dica}</p>}
    </div>
  );
}

/* ---------------- Área de texto ---------------- */

export function AreaTexto({
  rotulo,
  dica,
  id,
  className = '',
  ...resto
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { rotulo?: string; dica?: string }) {
  return (
    <div>
      {rotulo && <label htmlFor={id} className="t-rotulo">{rotulo}</label>}
      <textarea id={id} className={`campo ${className}`} {...resto} />
      {dica && <p className="msg msg-dica">{dica}</p>}
    </div>
  );
}

/* ---------------- Seletor ---------------- */

export function Seletor({
  rotulo,
  id,
  className = '',
  children,
  ...resto
}: SelectHTMLAttributes<HTMLSelectElement> & { rotulo?: string }) {
  return (
    <div>
      {rotulo && <label htmlFor={id} className="t-rotulo">{rotulo}</label>}
      <select id={id} className={`campo ${className}`} {...resto}>
        {children}
      </select>
    </div>
  );
}

/* ---------------- Etiqueta ---------------- */

export function Etiqueta({
  tom = 'neutro',
  children,
}: {
  tom?: 'neutro' | 'marca' | 'ok' | 'perigo';
  children: ReactNode;
}) {
  const sufixo = tom === 'neutro' ? '' : ` etiqueta-${tom}`;
  return <span className={`etiqueta${sufixo}`}>{children}</span>;
}

/* ---------------- Aviso em bloco ---------------- */

export function Aviso({ tom, children }: { tom: 'erro' | 'ok' | 'info'; children: ReactNode }) {
  return <div className={`aviso aviso-${tom}`} role={tom === 'erro' ? 'alert' : undefined}>{children}</div>;
}

/* ---------------- Modal ---------------- */

export function Modal({
  titulo,
  descricao,
  aoFechar,
  acoes,
  children,
}: {
  titulo: string;
  descricao?: string;
  aoFechar: () => void;
  acoes?: ReactNode;
  children?: ReactNode;
}) {
  // fecha com a tecla Esc
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  return (
    <div className="modal-fundo" onClick={aoFechar}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div className="modal-cabecalho">
          <div className="flex items-start justify-between gap-3">
            <h2 className="t-secao">{titulo}</h2>
            <button onClick={aoFechar} className="btn btn-fantasma btn-icone" aria-label="Fechar">
              <IconeFechar tamanho={15} />
            </button>
          </div>
          {descricao && <p className="t-corpo mt-1.5 leading-relaxed">{descricao}</p>}
        </div>
        {children && <div className="modal-corpo">{children}</div>}
        {acoes && <div className="modal-acoes">{acoes}</div>}
      </div>
    </div>
  );
}

/* ---------------- Skeleton ---------------- */

export function Skeleton({ largura = '100%', altura = 14, className = '' }: { largura?: string | number; altura?: string | number; className?: string }) {
  return <div className={`skeleton ${className}`} style={{ width: largura, height: altura }} aria-hidden="true" />;
}

export function SkeletonCartao() {
  return (
    <div className="cartao p-4" aria-hidden="true">
      <div className="flex items-start gap-3 mb-3">
        <Skeleton largura={36} altura={36} className="rounded-lg shrink-0" />
        <div className="flex-1 min-w-0">
          <Skeleton largura="70%" altura={13} />
          <div className="h-1.5" />
          <Skeleton largura="45%" altura={11} />
        </div>
      </div>
      <Skeleton largura="90%" altura={11} />
      <div className="h-1.5" />
      <Skeleton largura="60%" altura={11} />
      <div className="h-3" />
      <Skeleton largura="40%" altura={13} />
    </div>
  );
}

export function SkeletonLinha() {
  return (
    <div className="flex items-center gap-3 py-2.5" aria-hidden="true">
      <Skeleton largura="35%" altura={12} />
      <Skeleton largura="20%" altura={12} />
      <div className="ml-auto"><Skeleton largura={70} altura={12} /></div>
    </div>
  );
}

/* ---------------- Estado vazio ---------------- */

export function EstadoVazio({
  icone,
  titulo,
  texto,
  acao,
}: {
  icone?: ReactNode;
  titulo: string;
  texto?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {icone && (
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center mb-3.5"
          style={{ background: 'var(--surface-2)', color: 'var(--ink-3)', border: '1px solid var(--line)' }}
        >
          {icone}
        </div>
      )}
      <p className="t-secao mb-1">{titulo}</p>
      {texto && <p className="t-corpo max-w-[22rem] leading-relaxed">{texto}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

/* ---------------- Toast ---------------- */

export function Toast({ texto }: { texto: string }) {
  return (
    <div className="toast" role="status">
      <IconeCheck tamanho={14} />
      {texto}
    </div>
  );
}

/* ---------------- Cabeçalho de página ---------------- */

export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
      <div className="min-w-0">
        <h1 className="t-titulo">{titulo}</h1>
        {descricao && <p className="t-corpo mt-1">{descricao}</p>}
      </div>
      {acoes && <div className="flex items-center gap-2 shrink-0">{acoes}</div>}
    </div>
  );
}

/* ---------------- Barra de indicador ---------------- */

export function Progresso({ valor, tom = 'marca' }: { valor: number; tom?: 'marca' | 'ok' }) {
  return (
    <div
      className="h-1.5 rounded-full overflow-hidden"
      style={{ background: 'var(--surface-3)' }}
      role="progressbar"
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${valor}%`, background: tom === 'ok' ? 'var(--ok)' : 'var(--marca-1)' }}
      />
    </div>
  );
}
