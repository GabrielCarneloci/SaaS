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

  useEffect(() => {
    carregarLeadsSalvos();
  }, []);

  async function carregarLeadsSalvos() {
    const res = await fetch('/api/leads/list');
    const data = await res.json();
    if (res.ok) setLeads(data.leads ?? []);
  }

  async function buscarLeads() {
    if (!nicho || !localidade) {
      setErro('Preencha nicho e localidade');
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
      setErro(e.message || 'Erro ao buscar leads');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto px-6 py-12">

        <div className="flex items-baseline justify-between mb-10 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <h1 className="text-lg font-medium" style={{ color: 'var(--text)' }}>
            Radar de Leads
          </h1>
          <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
            empresas sem site
          </span>
        </div>

        <div className="mb-10">
          <div className="text-6xl font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>
            {leads.length}
          </div>
          <div className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
            {leads.length === 1 ? 'lead encontrado' : 'leads encontrados'}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            className="flex-1 px-4 py-3 rounded text-sm outline-none transition-colors"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            placeholder="Nicho — ex: barbearia, dentista"
            value={nicho}
            onChange={(e) => setNicho(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarLeads()}
          />
          <input
            className="flex-1 px-4 py-3 rounded text-sm outline-none transition-colors"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            placeholder="Cidade, Estado"
            value={localidade}
            onChange={(e) => setLocalidade(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarLeads()}
          />
          <button
            onClick={buscarLeads}
            disabled={carregando}
            className="px-6 py-3 rounded text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            {carregando ? 'Buscando…' : 'Buscar'}
          </button>
        </div>

        {erro && (
          <p className="text-sm mb-6" style={{ color: 'var(--danger)' }}>
            {erro}
          </p>
        )}

        {leads.length > 0 ? (
          <div>
            {leads.map((lead, i) => (
              <div
                key={i}
                className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {lead.nome}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                    {lead.endereco}
                    {lead.avaliacao ? ` · ${lead.avaliacao} estrelas` : ''}
                  </div>
                </div>
                <div className="text-sm tabular-nums" style={{ color: 'var(--accent)' }}>
                  {lead.telefone}
                </div>
              </div>
            ))}
          </div>
        ) : (
          !carregando && (
            <div className="py-16 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
              Nenhum resultado ainda. Busque um nicho e uma cidade acima.
            </div>
          )
        )}
      </div>
    </div>
  );
}
