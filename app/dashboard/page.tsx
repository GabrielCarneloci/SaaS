'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';

interface Lead {
  id: number;
  nome: string;
  endereco: string;
  telefone: string;
  avaliacao: number | null;
  total_avaliacoes: number | null;
  categoria: string | null;
  status_negocio: string | null;
  horario_funcionamento: string | null;
  google_maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  nicho: string;
  localidade: string;
  contatado: boolean;
}

type Ordenacao = 'recentes' | 'nome' | 'avaliacao';

const CORES = { accent: '#6366f1', cyan: '#0891b2', dim: '#71717a', border: '#e8e8ec', danger: '#ef4444', success: '#10b981' };

export default function Dashboard() {
  const router = useRouter();
  const [emailUsuario, setEmailUsuario] = useState('');
  const [ehAdmin, setEhAdmin] = useState(false);
  const [logado, setLogado] = useState<boolean | null>(null);
  const [nicho, setNicho] = useState('');
  const [uf, setUf] = useState('');
  const [cidade, setCidade] = useState('');
  const [estados, setEstados] = useState<{ sigla: string; nome: string }[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);
  const localidade = uf && cidade ? `${cidade}, ${uf}` : '';
  const [leads, setLeads] = useState<Lead[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState<number | null>(null);
  const [promptCopiado, setPromptCopiado] = useState<number | null>(null);

  const [busca, setBusca] = useState('');
  const [notaMin, setNotaMin] = useState(0);
  const [ordenar, setOrdenar] = useState<Ordenacao>('recentes');
  const [soNaoContatados, setSoNaoContatados] = useState(false);
  const [confirmarLimpar, setConfirmarLimpar] = useState(false);

  useEffect(() => {
    conferirAcesso();
    carregarEstados();
  }, []);

  async function carregarEstados() {
    try {
      const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
      const dados = await res.json();
      setEstados(dados.map((e: any) => ({ sigla: e.sigla, nome: e.nome })));
    } catch {}
  }

  async function selecionarUf(novaUf: string) {
    setUf(novaUf);
    setCidade('');
    setCidades([]);
    if (!novaUf) return;
    setCarregandoCidades(true);
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${novaUf}/municipios`);
      const dados = await res.json();
      setCidades(dados.map((c: any) => c.nome));
    } catch {
    } finally {
      setCarregandoCidades(false);
    }
  }

  async function conferirAcesso() {
    try {
      const res = await fetch('/api/auth/eu');
      const data = await res.json();
      if (data.usuario) {
        setLogado(true);
        setEmailUsuario(data.usuario.email);
        setEhAdmin(data.usuario.is_admin);
        carregarLeadsSalvos();
      } else {
        setLogado(false);
      }
    } catch {
      setLogado(false);
    }
  }

  async function carregarLeadsSalvos() {
    try {
      const res = await fetch('/api/leads/list');
      const data = await res.json();
      if (res.ok) setLeads(data.leads ?? []);
    } catch {}
  }

  async function sair() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function buscarLeads() {
    if (!nicho || !localidade) {
      setErro('Preencha nicho, estado e cidade para iniciar a varredura');
      return;
    }
    setErro('');
    setCarregando(true);
    try {
      if (logado) {
        const res = await fetch('/api/leads/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nicho, localidade }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.erro);
        await carregarLeadsSalvos();
      } else {
        const res = await fetch('/api/leads/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nicho, localidade }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.erro);
        setLeads(
          (data.leads ?? []).map((l: any, i: number) => ({
            id: i,
            nome: l.nome,
            endereco: l.endereco,
            avaliacao: l.avaliacao,
            total_avaliacoes: null,
            categoria: null,
            status_negocio: null,
            horario_funcionamento: null,
            google_maps_url: null,
            latitude: null,
            longitude: null,
            telefone: l.telefone,
            nicho,
            localidade,
            contatado: false,
          }))
        );
      }
    } catch (e: any) {
      setErro(e.message || 'Falha na varredura');
    } finally {
      setCarregando(false);
    }
  }

  async function alternarContato(id: number) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, contatado: !l.contatado } : l)));
    try {
      await fetch('/api/leads/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {
      carregarLeadsSalvos();
    }
  }

  async function limparTudo() {
    setConfirmarLimpar(false);
    setLeads([]);
    try {
      await fetch('/api/leads/clear', { method: 'POST' });
    } catch {
      carregarLeadsSalvos();
    }
  }

  function copiarTelefone(tel: string, id: number) {
    navigator.clipboard.writeText(tel);
    setCopiado(id);
    setTimeout(() => setCopiado(null), 1500);
  }

  function copiarPrompt(lead: Lead) {
    const linhas = [
      `Empresa: ${lead.nome}`,
      lead.categoria ? `Categoria: ${lead.categoria}` : null,
      `Endereço: ${lead.endereco}`,
      `Telefone: ${lead.telefone}`,
      lead.avaliacao ? `Avaliação: ${lead.avaliacao} (${lead.total_avaliacoes ?? 0} avaliações)` : null,
      lead.status_negocio ? `Status: ${lead.status_negocio}` : null,
      lead.horario_funcionamento ? `Horário de funcionamento: ${lead.horario_funcionamento}` : null,
      lead.google_maps_url ? `Google Maps: ${lead.google_maps_url}` : null,
      '',
      'Esta empresa não possui site. Escreva uma mensagem curta e natural para oferecer a criação de um site profissional para ela, mencionando um detalhe específico do negócio.',
    ].filter(Boolean);
    navigator.clipboard.writeText(linhas.join('\n'));
    setPromptCopiado(lead.id);
    setTimeout(() => setPromptCopiado(null), 1800);
  }

  const soDigitos = (tel: string) => tel.replace(/\D/g, '');

  function exportarCSV() {
    const linhas = [
      ['Nome', 'Categoria', 'Endereço', 'Avaliação', 'Telefone', 'Status', 'Contatado'],
      ...leadsFiltrados.map((l) => [
        l.nome, l.categoria ?? '', l.endereco, l.avaliacao ?? '', l.telefone,
        l.status_negocio ?? '', l.contatado ? 'Sim' : 'Não',
      ]),
    ];
    const csv = linhas.map((linha) => linha.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const leadsFiltrados = useMemo(() => {
    let r = [...leads];
    if (busca) {
      const q = busca.toLowerCase();
      r = r.filter((l) => l.nome?.toLowerCase().includes(q) || l.endereco?.toLowerCase().includes(q));
    }
    if (notaMin > 0) r = r.filter((l) => (l.avaliacao ?? 0) >= notaMin);
    if (soNaoContatados) r = r.filter((l) => !l.contatado);
    if (ordenar === 'nome') r.sort((a, b) => a.nome.localeCompare(b.nome));
    else if (ordenar === 'avaliacao') r.sort((a, b) => (b.avaliacao ?? 0) - (a.avaliacao ?? 0));
    return r;
  }, [leads, busca, notaMin, soNaoContatados, ordenar]);

  const contatados = leads.filter((l) => l.contatado).length;
  const comAval = leads.filter((l) => l.avaliacao).length;
  const mediaAval = comAval > 0 ? (leads.reduce((s, l) => s + (l.avaliacao || 0), 0) / comAval).toFixed(1) : '—';

  // Dados para gráficos
  const dadosAvaliacao = useMemo(() => {
    const faixas = { '1-2★': 0, '3★': 0, '4★': 0, '5★': 0, 'Sem nota': 0 };
    leads.forEach((l) => {
      if (!l.avaliacao) faixas['Sem nota']++;
      else if (l.avaliacao < 3) faixas['1-2★']++;
      else if (l.avaliacao < 4) faixas['3★']++;
      else if (l.avaliacao < 5) faixas['4★']++;
      else faixas['5★']++;
    });
    return Object.entries(faixas).map(([nome, valor]) => ({ nome, valor }));
  }, [leads]);

  const dadosContato = useMemo(
    () => [
      { nome: 'Contatados', valor: contatados },
      { nome: 'Pendentes', valor: leads.length - contatados },
    ],
    [leads, contatados]
  );

  const dadosNicho = useMemo(() => {
    const contagem: Record<string, number> = {};
    leads.forEach((l) => {
      const chave = l.nicho || 'outros';
      contagem[chave] = (contagem[chave] || 0) + 1;
    });
    return Object.entries(contagem)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6);
  }, [leads]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ===== Painel lateral ===== */}
      <aside
        className="lg:w-[380px] lg:min-h-screen shrink-0 flex flex-col relative overflow-hidden"
        style={{ background: 'var(--panel)', borderRight: '1px solid var(--border)' }}
      >
        <div className="absolute inset-0 radar-grid pointer-events-none" />
        <div className="relative p-8 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <RadarIcon ativo={carregando} />
            <div>
              <h1 className="text-base font-semibold tracking-tight" style={{ color: 'var(--text)' }}>Radar de Leads</h1>
              <p className="text-[11px] mono" style={{ color: 'var(--text-faint)' }}>v3.0 · busca ativa</p>
            </div>
          </div>

          <div className="h-px mb-6" style={{ background: 'var(--border)' }} />

          <Campo label="Nicho">
            <input
              className="input-radar"
              placeholder="barbearia, dentista, pizzaria…"
              value={nicho}
              onChange={(e) => setNicho(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscarLeads()}
            />
          </Campo>

          <Campo label="Estado">
            <select className="input-radar" value={uf} onChange={(e) => selecionarUf(e.target.value)}>
              <option value="">Selecione o estado</option>
              {estados.map((e) => (
                <option key={e.sigla} value={e.sigla}>{e.nome}</option>
              ))}
            </select>
          </Campo>

          <Campo label="Cidade">
            <select
              className="input-radar"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              disabled={!uf || carregandoCidades}
            >
              <option value="">
                {carregandoCidades ? 'Carregando cidades…' : uf ? 'Selecione a cidade' : 'Escolha o estado primeiro'}
              </option>
              {cidades.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Campo>

          <button
            onClick={buscarLeads}
            disabled={carregando}
            className="w-full py-3.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60 mt-1"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {carregando ? 'Varrendo o mapa…' : 'Iniciar varredura'}
          </button>

          {erro && (
            <p className="text-xs mt-4 px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
              {erro}
            </p>
          )}

          <div className="mt-auto pt-8">
            <div className="grid grid-cols-3 gap-2.5">
              <Metrica label="Leads" valor={leads.length} destaque />
              <Metrica label="Contatados" valor={contatados} />
              <Metrica label="Nota méd." valor={mediaAval} />
            </div>
            <p className="text-[10px] mono mt-4 leading-relaxed" style={{ color: 'var(--text-faint)' }}>
              Empresas sem site no Google Maps. Dados via Google Places.
            </p>

            <div className="h-px my-4" style={{ background: 'var(--border)' }} />
            {logado ? (
              <>
                {ehAdmin && (
                  <a href="/admin" className="block text-xs mb-3 px-3 py-2 rounded-lg text-center font-medium" style={{ background: 'var(--bg)', border: '1px solid var(--border-bright)', color: 'var(--cyan)' }}>
                    Painel admin
                  </a>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs truncate" style={{ color: 'var(--text-dim)' }}>{emailUsuario}</span>
                  <button onClick={sair} className="text-xs shrink-0 ml-2" style={{ color: 'var(--text-faint)' }}>Sair</button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <a href="/login" className="flex-1 text-center text-xs py-2 rounded-lg" style={{ border: '1px solid var(--border-bright)', color: 'var(--text-dim)' }}>Entrar</a>
                <a href="/cadastro" className="flex-1 text-center text-xs py-2 rounded-lg font-semibold" style={{ background: 'var(--accent)', color: '#fff' }}>Criar conta</a>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ===== Resultados ===== */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Gráficos */}
        {logado && leads.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 lg:px-8 py-6" style={{ borderBottom: '1px solid var(--border)' }}>
            <GraficoCard titulo="Distribuição de avaliação">
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={dadosAvaliacao}>
                  <XAxis dataKey="nome" tick={{ fill: CORES.dim, fontSize: 10 }} axisLine={{ stroke: CORES.border }} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: 'var(--panel)', border: `1px solid ${CORES.border}`, fontSize: 12 }} labelStyle={{ color: '#fff' }} />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                    {dadosAvaliacao.map((_, i) => <Cell key={i} fill={CORES.accent} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GraficoCard>

            <GraficoCard titulo="Contatados vs pendentes">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={dadosContato} dataKey="valor" nameKey="nome" innerRadius={35} outerRadius={55} paddingAngle={3}>
                    <Cell fill={CORES.accent} />
                    <Cell fill={CORES.border} />
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--panel)', border: `1px solid ${CORES.border}`, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: CORES.dim }} />
                </PieChart>
              </ResponsiveContainer>
            </GraficoCard>

            <GraficoCard titulo="Leads por nicho">
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={dadosNicho} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="nome" tick={{ fill: CORES.dim, fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ background: 'var(--panel)', border: `1px solid ${CORES.border}`, fontSize: 12 }} />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]} fill={CORES.cyan} />
                </BarChart>
              </ResponsiveContainer>
            </GraficoCard>
          </div>
        )}

        {/* Barra de controles */}
        <div className="px-6 lg:px-8 py-4 sticky top-0 z-10 flex flex-col gap-3" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--accent)' }}>{leadsFiltrados.length}</span>
              <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                {leadsFiltrados.length === 1 ? 'empresa' : 'empresas'}
                {leadsFiltrados.length !== leads.length && <span style={{ color: 'var(--text-faint)' }}> de {leads.length}</span>}
              </span>
            </div>

            {logado && (
              <div className="flex items-center gap-2">
                <button onClick={exportarCSV} disabled={leads.length === 0} className="btn-secundario" title="Exportar CSV">
                  <DownloadIcon /> CSV
                </button>
                <button onClick={() => setConfirmarLimpar(true)} disabled={leads.length === 0} className="btn-secundario" style={{ color: 'var(--danger)' }} title="Limpar todos">
                  <TrashIcon /> Limpar
                </button>
              </div>
            )}
          </div>

          {logado && leads.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                className="px-3.5 py-2 rounded-lg text-sm outline-none flex-1 min-w-[160px]"
                style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }}
                placeholder="Filtrar por nome ou endereço…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <Select value={ordenar} onChange={(v) => setOrdenar(v as Ordenacao)} options={[
                { v: 'recentes', l: 'Mais recentes' }, { v: 'nome', l: 'Nome (A–Z)' }, { v: 'avaliacao', l: 'Melhor avaliados' },
              ]} />
              <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {[0, 3, 4, 4.5].map((n) => (
                  <button key={n} onClick={() => setNotaMin(n)} className="px-3 py-2 text-xs mono transition-colors"
                    style={{ background: notaMin === n ? 'var(--accent)' : 'var(--panel)', color: notaMin === n ? '#fff' : 'var(--text-dim)' }}>
                    {n === 0 ? 'Todas' : `${n}★`}
                  </button>
                ))}
              </div>
              <button onClick={() => setSoNaoContatados((v) => !v)} className="px-3.5 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{ background: soNaoContatados ? 'var(--accent)' : 'var(--panel)', color: soNaoContatados ? '#fff' : 'var(--text-dim)', border: '1px solid var(--border)' }}>
                Só não contatados
              </button>
            </div>
          )}
        </div>

        {/* Grade de cards */}
        <div className="flex-1 overflow-auto p-6 lg:p-8">
          {carregando && leads.length === 0 ? (
            <EstadoVarredura />
          ) : leadsFiltrados.length > 0 ? (
            <div className="relative">
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', filter: logado === false ? 'blur(6px)' : undefined, pointerEvents: logado === false ? 'none' : undefined, userSelect: logado === false ? 'none' : undefined }}
              >
                {leadsFiltrados.map((lead, i) => (
                  <div
                    key={lead.id}
                    className="rounded-xl p-5 fade-up flex flex-col"
                    style={{ background: 'var(--panel)', border: '1px solid var(--border)', animationDelay: `${Math.min(i * 0.03, 0.5)}s`, opacity: lead.contatado ? 0.6 : 1 }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)', textDecoration: lead.contatado ? 'line-through' : 'none' }}>
                          {lead.nome}
                        </div>
                        {lead.categoria && (
                          <div className="text-[11px] mono mt-0.5" style={{ color: 'var(--text-faint)' }}>{lead.categoria}</div>
                        )}
                      </div>
                      <button
                        onClick={() => alternarContato(lead.id)}
                        title={lead.contatado ? 'Marcar como não contatado' : 'Marcar como contatado'}
                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                        style={{ border: `1px solid ${lead.contatado ? 'var(--accent)' : 'var(--border-bright)'}`, background: lead.contatado ? 'var(--accent)' : 'transparent' }}
                      >
                        {lead.contatado && <CheckIcon />}
                      </button>
                    </div>

                    <p className="text-xs mb-3" style={{ color: 'var(--text-dim)' }}>{lead.endereco}</p>

                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      {lead.avaliacao ? (
                        <span className="flex items-center gap-1 text-xs mono" style={{ color: 'var(--text)' }}>
                          <span style={{ color: 'var(--accent)' }}>★</span>{lead.avaliacao}
                          {lead.total_avaliacoes ? <span style={{ color: 'var(--text-faint)' }}>({lead.total_avaliacoes})</span> : null}
                        </span>
                      ) : (
                        <span className="text-xs mono" style={{ color: 'var(--text-faint)' }}>sem nota</span>
                      )}
                      {lead.status_negocio && (
                        <span className="text-[10px] mono px-1.5 py-0.5 rounded" style={{
                          background: lead.status_negocio === 'OPERATIONAL' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                          color: lead.status_negocio === 'OPERATIONAL' ? 'var(--accent)' : 'var(--danger)',
                        }}>
                          {lead.status_negocio === 'OPERATIONAL' ? 'em atividade' : lead.status_negocio}
                        </span>
                      )}
                    </div>

                    {lead.horario_funcionamento && (
                      <details className="mb-3">
                        <summary className="text-[11px] mono cursor-pointer" style={{ color: 'var(--cyan)' }}>Horário de funcionamento</summary>
                        <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                          {lead.horario_funcionamento}
                        </p>
                      </details>
                    )}

                    <div className="text-sm mono mb-4" style={{ color: 'var(--cyan)' }}>{lead.telefone}</div>

                    <div className="mt-auto flex items-center gap-2 flex-wrap">
                      <button onClick={() => copiarTelefone(lead.telefone, lead.id)} className="icone-acao" style={{ opacity: 1 }} title="Copiar telefone">
                        {copiado === lead.id ? <span style={{ color: 'var(--accent)' }}>✓</span> : <CopyIcon />}
                      </button>
                      <a href={`https://wa.me/55${soDigitos(lead.telefone)}`} target="_blank" rel="noopener noreferrer" className="icone-acao" style={{ opacity: 1 }} title="Abrir no WhatsApp">
                        <WhatsIcon />
                      </a>
                      {lead.google_maps_url && (
                        <a href={lead.google_maps_url} target="_blank" rel="noopener noreferrer" className="icone-acao" style={{ opacity: 1 }} title="Ver no Google Maps">
                          <MapIcon />
                        </a>
                      )}
                      <button
                        onClick={() => copiarPrompt(lead)}
                        className="btn-secundario ml-auto"
                        style={{ fontSize: 11, padding: '6px 10px' }}
                        title="Copiar informações para usar em um prompt de IA"
                      >
                        {promptCopiado === lead.id ? <span style={{ color: 'var(--accent)' }}>✓ Copiado</span> : <><PromptIcon /> Copiar prompt</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {logado === false && (
                <div className="fixed inset-0 flex items-center justify-center p-6 pointer-events-none">
                  <div className="text-center max-w-sm p-8 rounded-2xl pointer-events-auto" style={{ background: 'var(--panel)', border: '1px solid var(--border-bright)' }}>
                    <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent)' }}>{leads.length}</div>
                    <p className="text-sm mb-1" style={{ color: 'var(--text)' }}>empresas sem site encontradas</p>
                    <p className="text-xs mb-6" style={{ color: 'var(--text-dim)' }}>Crie uma conta grátis para ver nomes, endereços e telefones.</p>
                    <a href="/cadastro" className="block w-full py-3 rounded-lg text-sm font-semibold mb-2" style={{ background: 'var(--accent)', color: '#fff' }}>Criar conta grátis</a>
                    <a href="/login" className="block text-xs" style={{ color: 'var(--text-dim)' }}>Já tenho conta — entrar</a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EstadoVazio temLeads={leads.length > 0} />
          )}
        </div>
      </main>

      {confirmarLimpar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setConfirmarLimpar(false)}>
          <div className="w-full max-w-sm rounded-xl p-6 fade-up" style={{ background: 'var(--panel)', border: '1px solid var(--border-bright)' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>Limpar todos os leads?</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-dim)' }}>Isso apaga permanentemente os {leads.length} leads salvos. Não dá pra desfazer.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmarLimpar(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg)', border: '1px solid var(--border-bright)', color: 'var(--text-dim)' }}>Cancelar</button>
              <button onClick={limparTudo} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--danger)', color: '#fff' }}>Limpar tudo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="text-[11px] mono uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-dim)' }}>{label}</label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="px-3.5 py-2 rounded-lg text-sm outline-none cursor-pointer"
      style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }}>
      {options.map((o) => <option key={o.v} value={o.v} style={{ background: 'var(--panel)' }}>{o.l}</option>)}
    </select>
  );
}

function Metrica({ label, valor, destaque }: { label: string; valor: string | number; destaque?: boolean }) {
  return (
    <div className="px-3 py-2.5 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
      <div className="text-lg font-bold tabular-nums mono" style={{ color: destaque ? 'var(--accent)' : 'var(--text)' }}>{valor}</div>
      <div className="text-[9px] mono uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-faint)' }}>{label}</div>
    </div>
  );
}

function GraficoCard({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
      <p className="text-[11px] mono uppercase tracking-wide mb-2" style={{ color: 'var(--text-faint)' }}>{titulo}</p>
      {children}
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

function CopyIcon() { return (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>); }
function CheckIcon() { return (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>); }
function DownloadIcon() { return (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>); }
function TrashIcon() { return (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>); }
function MapIcon() { return (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 20l-5.5 2V6l5.5-2m0 16l6-2m-6 2V4m6 14l5.5 2V4L15 2m0 16V2m0 0l-6 2" /></svg>); }
function PromptIcon() { return (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }}><path d="M4 17l6-6-6-6M12 19h8" /></svg>); }
function WhatsIcon() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.8.9.9-2.8-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.7.9-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.5-.2-.3.2-.3.5-.9.1-.1 0-.3 0-.4 0-.1-.5-1.2-.7-1.7-.2-.4-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.5 4 3.4.6.3 1 .4 1.4.5.6.2 1.1.2 1.5.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1-.1-.1-.2-.2-.4-.2z" /></svg>); }

function EstadoVazio({ temLeads }: { temLeads: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8">
      <svg viewBox="0 0 96 96" className="w-24 h-24 mb-6">
        <circle cx="48" cy="48" r="44" fill="none" stroke="var(--border)" strokeWidth="1" />
        <circle cx="48" cy="48" r="30" fill="none" stroke="var(--border)" strokeWidth="1" />
        <circle cx="48" cy="48" r="16" fill="none" stroke="var(--border)" strokeWidth="1" />
        <circle cx="48" cy="48" r="2" fill="var(--text-faint)" />
      </svg>
      <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{temLeads ? 'Nenhum resultado para esses filtros.' : 'Radar em espera.'}</p>
      <p className="text-xs mt-1 mono" style={{ color: 'var(--text-faint)' }}>{temLeads ? 'Ajuste os filtros acima.' : 'Informe nicho, estado e cidade para iniciar a varredura.'}</p>
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
      <p className="text-sm mono" style={{ color: 'var(--accent)' }}>Varrendo o mapa…</p>
      <p className="text-xs mt-1 mono" style={{ color: 'var(--text-faint)' }}>Filtrando empresas sem site</p>
    </div>
  );
}
