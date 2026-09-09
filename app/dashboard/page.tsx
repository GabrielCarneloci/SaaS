'use client';
import { useEffect, useState } from 'react';

interface Lead {
  nome: string;
  endereco: string;
  avaliacao: number | null;
  telefone: string;
}

export default function Dashboard() {
  const [nicho, setNicho] = useState('');
  const [localidade, setLocalidade] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState<number | null>(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregarLeadsSalvos();
  }, []);

  async function carregarLeadsSalvos() {
    try {
      const res = await fetch('/api/leads/list');
      const data = await res.json();
      if (res.ok) setLeads(data.leads ?? []);
    } catch {}
  }

  async function buscarLeads() {
    if (!nicho || !localidade) {
      setErro('Preencha nicho e localidade para iniciar a varredura');
      return;
    }
    setErro('');
    setCarregando(true);
    try {
      const res = await fetch('/api/leads/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicho, localidade }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro);
      await carregarLeadsSalvos();
    } catch (e: any) {
      setErro(e.message || 'Falha na varredura');
    } finally {
      setCarregando(false);
    }
  }

  function copiarTelefone(tel: string, i: number) {
    navigator.clipboard.writeText(tel);
    setCopiado(i);
    setTimeout(() => setCopiado(null), 1500);
  }

  function soDigitos(tel: string) {
    return tel.replace(/\D/g, '');
  }

  const leadsFiltrados = busca
    ? leads.filter(
        (l) =>
          l.nome?.toLowerCase().includes(busca.toLowerCase()) ||
          l.endereco?.toLowerCase().includes(busca.toLowerCase())
      )
    : leads;

  const comAvaliacao = leads.filter((l) => l.avaliacao).length;
  const mediaAval =
    comAvaliacao > 0
      ? (
          leads.reduce((s, l) => s + (l.avaliacao || 0), 0) / comAvaliacao
        ).toFixed(1)
      : '—';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ===== Painel lateral de busca ===== */}
      <aside
        className="lg:w-[380px] lg:min-h-screen shrink-0 flex flex-col relative overflow-hidden"
        style={{ background: 'var(--panel)', borderRight: '1px solid var(--border)' }}
      >
        <div className="absolute inset-0 radar-grid pointer-events-none" />

        <div className="relative p-8 flex flex-col h-full">
          {/* Marca */}
          <div className="flex items-center gap-3 mb-1">
            <RadarIcon ativo={carregando} />
            <div>
              <h1 className="text-base font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
                Radar de Leads
              </h1>
              <p className="text-[11px] mono" style={{ color: 'var(--text-faint)' }}>
                v1.0 · busca ativa
              </p>
            </div>
          </div>

          <div className="h-px my-6" style={{ background: 'var(--border)' }} />

          {/* Formulário */}
          <label className="text-[11px] mono uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-dim)' }}>
            Nicho
          </label>
          <input
            className="w-full px-4 py-3 rounded-lg text-sm mb-5 outline-none transition-all"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border-bright)',
              color: 'var(--text)',
            }}
            placeholder="barbearia, dentista, pizzaria…"
            value={nicho}
            onChange={(e) => setNicho(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarLeads()}
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-bright)')}
          />

          <label className="text-[11px] mono uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-dim)' }}>
            Localidade
          </label>
          <input
            className="w-full px-4 py-3 rounded-lg text-sm mb-6 outline-none transition-all"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border-bright)',
              color: 'var(--text)',
            }}
            placeholder="Cidade, Estado"
            value={localidade}
            onChange={(e) => setLocalidade(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarLeads()}
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-bright)')}
          />

          <button
            onClick={buscarLeads}
            disabled={carregando}
            className="w-full py-3.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60 relative overflow-hidden"
            style={{ background: 'var(--accent)', color: '#04120a' }}
          >
            {carregando ? 'Varrendo o mapa…' : 'Iniciar varredura'}
          </button>

          {erro && (
            <p className="text-xs mt-4 px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
              {erro}
            </p>
          )}

          {/* Métricas no rodapé */}
          <div className="mt-auto pt-8">
            <div className="grid grid-cols-2 gap-3">
              <Metrica label="Leads" valor={leads.length} destaque />
              <Metrica label="Avaliação méd." valor={mediaAval} />
            </div>
            <p className="text-[10px] mono mt-4 leading-relaxed" style={{ color: 'var(--text-faint)' }}>
              Empresas sem site cadastrado no Google Maps. Dados coletados via Google Places.
            </p>
          </div>
        </div>
      </aside>

      {/* ===== Área de resultados ===== */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header dos resultados */}
        <div
          className="px-8 py-5 flex items-center justify-between gap-4 sticky top-0 z-10"
          style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
              {leadsFiltrados.length}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
              {leadsFiltrados.length === 1 ? 'empresa encontrada' : 'empresas encontradas'}
            </span>
          </div>

          {leads.length > 0 && (
            <input
              className="px-4 py-2 rounded-lg text-sm outline-none w-56 max-w-[40vw]"
              style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }}
              placeholder="Filtrar resultados…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          )}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-auto">
          {carregando && leads.length === 0 ? (
            <EstadoVarredura />
          ) : leadsFiltrados.length > 0 ? (
            <div>
              {/* Cabeçalho da tabela */}
              <div
                className="hidden md:grid grid-cols-[1fr_130px_160px] gap-4 px-8 py-3 text-[11px] mono uppercase tracking-wider sticky top-0"
                style={{ color: 'var(--text-faint)', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
              >
                <span>Empresa</span>
                <span>Avaliação</span>
                <span className="text-right">Contato</span>
              </div>

              {leadsFiltrados.map((lead, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-[1fr_130px_160px] gap-2 md:gap-4 md:items-center px-8 py-4 transition-colors group fade-up"
                  style={{ borderBottom: '1px solid var(--border)', animationDelay: `${Math.min(i * 0.03, 0.5)}s` }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--panel-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Empresa */}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {lead.nome}
                    </div>
                    <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-dim)' }}>
                      {lead.endereco}
                    </div>
                  </div>

                  {/* Avaliação */}
                  <div className="flex items-center gap-1.5">
                    {lead.avaliacao ? (
                      <>
                        <span style={{ color: 'var(--accent)' }}>★</span>
                        <span className="text-sm mono" style={{ color: 'var(--text)' }}>
                          {lead.avaliacao}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs mono" style={{ color: 'var(--text-faint)' }}>
                        sem nota
                      </span>
                    )}
                  </div>

                  {/* Contato */}
                  <div className="flex items-center gap-2 md:justify-end">
                    <span className="text-sm mono" style={{ color: 'var(--cyan)' }}>
                      {lead.telefone}
                    </span>
                    <button
                      onClick={() => copiarTelefone(lead.telefone, i)}
                      title="Copiar telefone"
                      className="w-7 h-7 flex items-center justify-center rounded-md transition-colors md:opacity-0 md:group-hover:opacity-100"
                      style={{ border: '1px solid var(--border-bright)', color: 'var(--text-dim)' }}
                    >
                      {copiado === i ? (
                        <span style={{ color: 'var(--accent)' }}>✓</span>
                      ) : (
                        <CopyIcon />
                      )}
                    </button>
                    <a
                      href={`https://wa.me/55${soDigitos(lead.telefone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir no WhatsApp"
                      className="w-7 h-7 flex items-center justify-center rounded-md transition-colors md:opacity-0 md:group-hover:opacity-100"
                      style={{ border: '1px solid var(--border-bright)', color: 'var(--text-dim)' }}
                    >
                      <WhatsIcon />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EstadoVazio temLeads={leads.length > 0} />
          )}
        </div>
      </main>
    </div>
  );
}

/* ===== Componentes auxiliares ===== */

function Metrica({ label, valor, destaque }: { label: string; valor: string | number; destaque?: boolean }) {
  return (
    <div className="px-4 py-3 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
      <div className="text-xl font-bold tabular-nums mono" style={{ color: destaque ? 'var(--accent)' : 'var(--text)' }}>
        {valor}
      </div>
      <div className="text-[10px] mono uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-faint)' }}>
        {label}
      </div>
    </div>
  );
}

function RadarIcon({ ativo }: { ativo: boolean }) {
  return (
    <div className="relative w-9 h-9 shrink-0">
      <svg viewBox="0 0 36 36" className="w-9 h-9">
        <circle cx="18" cy="18" r="16" fill="none" stroke="var(--border-bright)" strokeWidth="1" />
        <circle cx="18" cy="18" r="10" fill="none" stroke="var(--border-bright)" strokeWidth="1" />
        <circle cx="18" cy="18" r="1.5" fill="var(--accent)" />
        <g className={ativo ? 'radar-sweep' : ''} style={{ transformOrigin: '18px 18px' }}>
          <line x1="18" y1="18" x2="18" y2="2" stroke="var(--accent)" strokeWidth="1.5" />
          <path d="M18 18 L18 2 A16 16 0 0 1 30 8 Z" fill="var(--accent)" opacity="0.15" />
        </g>
      </svg>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function WhatsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.8.9.9-2.8-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.7.9-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.5-.2-.3.2-.3.5-.9.1-.1 0-.3 0-.4 0-.1-.5-1.2-.7-1.7-.2-.4-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.5 4 3.4.6.3 1 .4 1.4.5.6.2 1.1.2 1.5.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1-.1-.1-.2-.2-.4-.2z" />
    </svg>
  );
}

function EstadoVazio({ temLeads }: { temLeads: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8">
      <div className="relative w-24 h-24 mb-6">
        <svg viewBox="0 0 96 96" className="w-24 h-24">
          <circle cx="48" cy="48" r="44" fill="none" stroke="var(--border)" strokeWidth="1" />
          <circle cx="48" cy="48" r="30" fill="none" stroke="var(--border)" strokeWidth="1" />
          <circle cx="48" cy="48" r="16" fill="none" stroke="var(--border)" strokeWidth="1" />
          <circle cx="48" cy="48" r="2" fill="var(--text-faint)" />
        </svg>
      </div>
      <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
        {temLeads ? 'Nenhum resultado para esse filtro.' : 'Radar em espera.'}
      </p>
      <p className="text-xs mt-1 mono" style={{ color: 'var(--text-faint)' }}>
        {temLeads ? 'Ajuste os termos de busca.' : 'Informe nicho e localidade para iniciar a varredura.'}
      </p>
    </div>
  );
}

function EstadoVarredura() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8">
      <div className="relative w-28 h-28 mb-6 flex items-center justify-center">
        <div className="absolute w-28 h-28 rounded-full pulse-ring" style={{ border: '2px solid var(--accent)' }} />
        <svg viewBox="0 0 112 112" className="w-28 h-28">
          <circle cx="56" cy="56" r="52" fill="none" stroke="var(--border-bright)" strokeWidth="1" />
          <circle cx="56" cy="56" r="34" fill="none" stroke="var(--border-bright)" strokeWidth="1" />
          <circle cx="56" cy="56" r="2" fill="var(--accent)" />
          <g className="radar-sweep" style={{ transformOrigin: '56px 56px' }}>
            <line x1="56" y1="56" x2="56" y2="4" stroke="var(--accent)" strokeWidth="2" />
            <path d="M56 56 L56 4 A52 52 0 0 1 92 20 Z" fill="var(--accent)" opacity="0.15" />
          </g>
        </svg>
      </div>
      <p className="text-sm mono" style={{ color: 'var(--accent)' }}>
        Varrendo o mapa…
      </p>
      <p className="text-xs mt-1 mono" style={{ color: 'var(--text-faint)' }}>
        Filtrando empresas sem site
      </p>
    </div>
  );
}
