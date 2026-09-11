// Ícones em traço, todos no mesmo estilo (24x24, stroke 1.75).
// Puramente visual — nenhum acesso a dados.
import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & { tamanho?: number };

function Base({ tamanho = 16, children, ...resto }: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...resto}
    >
      {children}
    </svg>
  );
}

export const IconeBusca = (p: Props) => (
  <Base {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Base>
);
export const IconePainel = (p: Props) => (
  <Base {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></Base>
);
export const IconeConta = (p: Props) => (
  <Base {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" /></Base>
);
export const IconeEscudo = (p: Props) => (
  <Base {...p}><path d="M12 3l7 3v5.5c0 4.2-2.9 7.6-7 9.5-4.1-1.9-7-5.3-7-9.5V6z" /></Base>
);
export const IconeSair = (p: Props) => (
  <Base {...p}><path d="M15 17v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v2" /><path d="M19 12H9m10 0-3-3m3 3-3 3" /></Base>
);
export const IconeLua = (p: Props) => (
  <Base {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></Base>
);
export const IconeSol = (p: Props) => (
  <Base {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Base>
);
export const IconeCopiar = (p: Props) => (
  <Base {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Base>
);
export const IconeCheck = (p: Props) => (
  <Base {...p}><path d="m4 12 5 5L20 6" /></Base>
);
export const IconeBaixar = (p: Props) => (
  <Base {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></Base>
);
export const IconeLixeira = (p: Props) => (
  <Base {...p}><path d="M3 6h18M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6m3 0v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></Base>
);
export const IconeMapa = (p: Props) => (
  <Base {...p}><path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4zM9 4v13M15 6.5v13" /></Base>
);
export const IconeFechar = (p: Props) => (
  <Base {...p}><path d="M6 6l12 12M18 6L6 18" /></Base>
);
export const IconeVoltar = (p: Props) => (
  <Base {...p}><path d="M19 12H5m0 0 6-6m-6 6 6 6" /></Base>
);
export const IconeNota = (p: Props) => (
  <Base {...p}><path d="M5 5h14M5 12h14M5 19h8" /></Base>
);
export const IconeEstrela = ({ tamanho = 16, preenchida, ...resto }: Props & { preenchida?: boolean }) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 24 24"
    fill={preenchida ? 'currentColor' : 'none'} stroke="currentColor"
    strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true" {...resto}>
    <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.5 9.7l5.9-.8z" />
  </svg>
);
export const IconeWhatsapp = ({ tamanho = 16, ...resto }: Props) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...resto}>
    <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.8.9.9-2.8-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.7.9-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.5-.2-.3.2-.3.5-.9.1-.1 0-.3 0-.4 0-.1-.5-1.2-.7-1.7-.2-.4-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.5 4 3.4.6.3 1 .4 1.4.5.6.2 1.1.2 1.5.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1-.1-.1-.2-.2-.4-.2z" />
  </svg>
);
export const IconeRelogio = (p: Props) => (
  <Base {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Base>
);
export const IconeAlerta = (p: Props) => (
  <Base {...p}><path d="M12 8v5M12 16.5v.5" /><circle cx="12" cy="12" r="9" /></Base>
);
export const IconeMenu = (p: Props) => (
  <Base {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Base>
);
export const IconeHistorico = (p: Props) => (
  <Base {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 8v4.5l3 1.8" /></Base>
);
