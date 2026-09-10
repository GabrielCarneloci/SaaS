'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

const MapaLeads = dynamic(() => import('@/components/MapaLeads'), {
  ssr: false,
  loading: () => <div className="w-full h-full" style={{ background: 'var(--surface-2)' }} />,
});

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
  notas: string | null;
  tags: string[] | null;
}

interface ItemHistorico {
  id: number;
  nicho: string;
  localidade: string;
  total: number;
  criado_em: string;
}

type Ordenacao = 'recentes' | 'nome' | 'avaliacao';

export default function Dashboard() {
  const router = useRouter();

  const [tema, setTema] = useState<'claro' | 'escuro'>('claro');
  const [logado, setLogado] = useState<boolean | null>(null);
  const [emailUsuario, setEmailUsuario] = useState('');
  const [ehAdmin, setEhAdmin] = useState(false);

  const [nicho, setNicho] = useState('');
  const [uf, setUf] = useState('');
  const [cidade, setCidade] = useState('');
  const [estados, setEstados] = useState<{ sigla: string; nome: string }[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);
  const localidade = uf && cidade ? `${cidade}, ${uf}` : '';

  const [leads, setLeads] = useState<Lead[]>([]);
  const [historico, setHistorico] = useState<ItemHistorico[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [aviso, setAviso] = useState('');

  const [busca, setBusca] = useState('');
  const [notaMin, setNotaMin] = useState(0);
  const [ordenar, setOrdenar] = useState<Ordenacao>('recentes');
  const [soNaoContatados, setSoNaoContatados] = useState(false);
  const [confirmarLimpar, setConfirmarLimpar] = useState(false);
  const [verMapa, setVerMapa] = useState(false);

  const [rascunhoNota, setRascunhoNota] = useState('');
  const [rascunhoTags, setRascunhoTags] = useState('');
  const [salvandoNota, setSalvandoNota] = useState(false);

  /* ---------- init ---------- */

  useEffect(() => {
    const salvo = (localStorage.getItem('tema') as 'claro' | 'escuro') || null;
    const inicial = salvo || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro');
    setTema(inicial);
    document.documentElement.setAttribute('data-tema', inicial);
    conferirAcesso();
    carregarEstados();
  }, []);

  function alternarTema() {
    const novo = tema === 'claro' ? 'escuro' : 'claro';
    setTema(novo);
    localStorage.setItem('tema', novo);
    document.documentElement.setAttribute('data-tema', novo);
  }

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
        carregarLeads();
        carregarHistorico();
      } else {
        setLogado(false);
      }
    } catch {
      setLogado(false);
    }
  }

  async function carregarLeads() {
    try {
      const res = await fetch('/api/leads/list');
      const data = await res.json();
      if (res.ok) setLeads(data.leads ?? []);
    } catch {}
  }

  async function carregarHistorico() {
    try {
      const res = await fetch('/api/historico');
      const data = await res.json();
      if (res.ok) setHistorico(data.historico ?? []);
    } catch {}
  }

  /* ---------- ações ---------- */

  async function buscarLeads() {
    if (!nicho || !localidade) {
      setErro('Escolha um nicho, um estado e uma cidade.');
      return;
    }
    setErro('');
    setCarregando(true);
    try {
      const rota = logado ? '/api/leads/search' : '/api/leads/preview';
      const res = await fetch(rota, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicho, localidade }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro);

      if (logado) {
        await carregarLeads();
        await carregarHistorico();
      } else {
        setLeads(
          (data.leads ?? []).map((l: any, i: number) => ({
            id: i, nome: l.nome, endereco: l.endereco, telefone: l.telefone,
            avaliacao: l.avaliacao, total_avaliacoes: null, categoria: null,
            status_negocio: null, horario_funcionamento: null, google_maps_url: null,
            latitude: null, longitude: null, nicho, localidade, contatado: false,
            notas: null, tags: null,
          }))
        );
      }
    } catch (e: any) {
      setErro(e.message || 'A busca não foi concluída. Tente de novo.');
    } finally {
      setCarregando(false);
    }
  }

  function repetirBusca(item: ItemHistorico) {
    setNicho(item.nicho);
    const partes = item.localidade.split(', ');
    if (partes.length === 2) {
      selecionarUf(partes[1]);
      setTimeout(() => setCidade(partes[0]), 500);
    }
  }

  async function alternarContato(id: number) {
    setLeads((p) => p.map((l) => (l.id === id ? { ...l, contatado: !l.contatado } : l)));
    try {
      await fetch('/api/leads/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {
      carregarLeads();
    }
  }

  async function salvarNota() {
    if (selecionado == null) return;
    setSalvandoNota(true);
    const tags = rascunhoTags.split(',').map((t) => t.trim()).filter(Boolean);
    try {
      await fetch('/api/leads/nota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selecionado, notas: rascunhoNota, tags }),
      });
      setLeads((p) => p.map((l) => (l.id === selecionado ? { ...l, notas: rascunhoNota, tags } : l)));
      mostrarAviso('Anotação salva');
    } catch {
      mostrarAviso('A anotação não foi salva');
    } finally {
      setSalvandoNota(false);
    }
  }

  async function limparTudo() {
    setConfirmarLimpar(false);
    setLeads([]);
    setSelecionado(null);
    try {
      await fetch('/api/leads/clear', { method: 'POST' });
    } catch {
      carregarLeads();
    }
  }

  async function sair() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  function mostrarAviso(texto: string) {
    setAviso(texto);
    setTimeout(() => setAviso(''), 2200);
  }

  function copiar(texto: string, confirmacao: string) {
    navigator.clipboard.writeText(texto);
    mostrarAviso(confirmacao);
  }

  const soDigitos = (t: string) => t.replace(/\D/g, '');

  function textoParaPrompt(lead: Lead) {
    return [
      `Empresa: ${lead.nome}`,
      lead.categoria ? `Categoria: ${lead.categoria}` : null,
      `Endereço: ${lead.endereco}`,
      `Telefone: ${lead.telefone}`,
      lead.avaliacao ? `Avaliação: ${lead.avaliacao} de 5 (${lead.total_avaliacoes ?? 0} avaliações)` : null,
      lead.horario_funcionamento ? `Horário: ${lead.horario_funcionamento}` : null,
      lead.notas ? `Minhas anotações: ${lead.notas}` : null,
      '',
      'Esta empresa não tem site. Escreva uma mensagem curta e natural oferecendo a criação de um site profissional, citando um detalhe específico do negócio.',
    ].filter(Boolean).join('\n');
  }

  /* ---------- derivados ---------- */

  const visiveis = useMemo(() => {
    let r = [...leads];
    if (busca) {
      const q = busca.toLowerCase();
      r = r.filter((l) =>
        l.nome?.toLowerCase().includes(q) ||
        l.endereco?.toLowerCase().includes(q) ||
        (l.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    }
    if (notaMin > 0) r = r.filter((l) => (l.avaliacao ?? 0) >= notaMin);
    if (soNaoContatados) r = r.filter((l) => !l.contatado);
    if (ordenar === 'nome') r.sort((a, b) => a.nome.localeCompare(b.nome));
    else if (ordenar === 'avaliacao') r.sort((a, b) => (b.avaliacao ?? 0) - (a.avaliacao ?? 0));
    return r;
  }, [leads, busca, notaMin, soNaoContatados, ordenar]);

  function exportarCSV() {
    const linhas = [
      ['Nome', 'Categoria', 'Endereço', 'Telefone', 'Avaliação', 'Contatado', 'Etiquetas', 'Anotações'],
      ...visiveis.map((l) => [
        l.nome, l.categoria ?? '', l.endereco, l.telefone, l.avaliacao ?? '',
        l.contatado ? 'Sim' : 'Não', (l.tags ?? []).join(' / '), l.notas ?? '',
      ]),
    ];
    const csv = linhas.map((li) => li.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const leadAtual = useMemo(() => leads.find((l) => l.id === selecionado) ?? null, [leads, selecionado]);

  useEffect(() => {
    setRascunhoNota(leadAtual?.notas ?? '');
    setRascunhoTags((leadAtual?.tags ?? []).join(', '));
  }, [leadAtual?.id]);

  const contatados = leads.filter((l) => l.contatado).length;
  const progresso = leads.length ? Math.round((contatados / leads.length) * 100) : 0;
  const comAval = leads.filter((l) => l.avaliacao).length;
  const mediaAval = comAval > 0
    ? (leads.reduce((s, l) => s + (Number(l.avaliacao) || 0), 0) / comAval).toFixed(1)
    : '—';
  const comCoordenadas = useMemo(
    () => visiveis.filter((l) => l.latitude != null && l.longitude != null),
    [visiveis]
  );

  const dadosAvaliacao = useMemo(() => {
    const faixas: Record<string, number> = { 'até 3': 0, '3 a 4': 0, '4 a 4.5': 0, '4.5+': 0, 'sem nota': 0 };
    leads.forEach((l) => {
      if (!l.avaliacao) faixas['sem nota']++;
      else if (l.avaliacao < 3) faixas['até 3']++;
      else if (l.avaliacao < 4) faixas['3 a 4']++;
      else if (l.avaliacao < 4.5) faixas['4 a 4.5']++;
      else faixas['4.5+']++;
    });
    return Object.entries(faixas).map(([nome, valor]) => ({ nome, valor }));
  }, [leads]);

  const dadosNicho = useMemo(() => {
    const c: Record<string, number> = {};
    leads.forEach((l) => { const k = l.nicho || 'outros'; c[k] = (c[k] || 0) + 1; });
    return Object.entries(c).map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor).slice(0, 5);
  }, [leads]);

  const escolherLead = useCallback((id: number) => setSelecionado(id), []);
  const visitante = logado === false;

  const cores = {
    violeta: tema === 'escuro' ? '#8b6dff' : '#6c4cf1',
    coral: tema === 'escuro' ? '#ff6b93' : '#ff4d7d',
    turquesa: tema === 'escuro' ? '#2ad9c8' : '#00c2b2',
    ambar: tema === 'escuro' ? '#ffb246' : '#ff9f1c',
    dim: tema === 'escuro' ? '#736d94' : '#918cad',
    superficie: tema === 'escuro' ? '#16122a' : '#ffffff',
    linha: tema === 'escuro' ? '#262040' : '#e6e4f2',
  };
  const paleta = [cores.violeta, cores.coral, cores.turquesa, cores.ambar, cores.dim];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-x-hidden" style={{ background: 'var(--canvas)' }}>

      {/* ============ BARRA LATERAL ============ */}
      <aside
        className="lg:w-[310px] shrink-0 lg:h-screen lg:sticky lg:top-0 flex flex-col lg:overflow-y-auto"
        style={{ background: 'var(--surface)', borderRight: '1.5px solid var(--line)' }}
      >
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <span className="destaque gradiente text-[24px] leading-none">Radar</span>
            <button
              onClick={alternarTema}
              className="acao-discreta"
              style={{ padding: '6px 9px' }}
              aria-label="Alternar tema"
              title="Alternar tema"
            >
              {tema === 'claro' ? <IconeLua /> : <IconeSol />}
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="nicho" className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>
                Nicho
              </label>
              <input
                id="nicho"
                className="campo"
                placeholder="barbearia, dentista, pizzaria"
                value={nicho}
                onChange={(e) => setNicho(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarLeads()}
              />
            </div>

            <div>
              <label htmlFor="uf" className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>
                Estado
              </label>
              <select id="uf" className="campo" value={uf} onChange={(e) => selecionarUf(e.target.value)}>
                <option value="">Escolha um estado</option>
                {estados.map((e) => <option key={e.sigla} value={e.sigla}>{e.nome}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="cidade" className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>
                Cidade
              </label>
              <select
                id="cidade" className="campo" value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                disabled={!uf || carregandoCidades}
              >
                <option value="">
                  {carregandoCidades ? 'Carregando cidades' : uf ? 'Escolha uma cidade' : 'Escolha o estado antes'}
                </option>
                {cidades.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <button onClick={buscarLeads} disabled={carregando} className="acao">
              {carregando ? 'Buscando…' : 'Buscar empresas'}
            </button>

            {erro && (
              <p className="text-[13px] px-3 py-2.5 rounded-xl" style={{ background: 'var(--danger-lav)', color: 'var(--danger)' }}>
                {erro}
              </p>
            )}
          </div>
        </div>

        {/* progresso */}
        {logado && leads.length > 0 && (
          <div className="px-6 py-4" style={{ borderTop: '1.5px solid var(--line)' }}>
            <div className="flex items-end justify-between mb-2">
              <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>
                {contatados} de {leads.length} contatadas
              </span>
              <span className="destaque text-[19px] leading-none" style={{ color: 'var(--turquesa)' }}>
                {progresso}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progresso}%`, background: 'linear-gradient(90deg, var(--turquesa), var(--violeta))' }}
              />
            </div>
          </div>
        )}

        {/* histórico */}
        {logado && historico.length > 0 && (
          <div className="px-6 py-4 lg:flex-1 lg:overflow-auto max-h-[240px] overflow-auto" style={{ borderTop: '1.5px solid var(--line)' }}>
            <p className="text-[13px] font-medium mb-2" style={{ color: 'var(--ink-2)' }}>Buscas anteriores</p>
            <div className="space-y-1">
              {historico.slice(0, 8).map((h) => (
                <button
                  key={h.id}
                  onClick={() => repetirBusca(h)}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-[13px] flex items-center justify-between gap-2 transition-colors"
                  style={{ color: 'var(--ink-2)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--violeta-lav)'; e.currentTarget.style.color = 'var(--violeta)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-2)'; }}
                >
                  <span className="truncate">{h.nicho}, {h.localidade}</span>
                  <span className="shrink-0 font-semibold">{h.total}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* conta */}
        <div className="mt-auto px-6 py-4" style={{ borderTop: '1.5px solid var(--line)' }}>
          {logado ? (
            <>
              {ehAdmin && (
                <a href="/admin" className="block text-[13px] font-medium mb-2.5" style={{ color: 'var(--violeta)' }}>
                  Painel do administrador
                </a>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] truncate" style={{ color: 'var(--ink-3)' }}>{emailUsuario}</span>
                <button onClick={sair} className="text-[13px] shrink-0 font-medium" style={{ color: 'var(--ink-2)' }}>
                  Sair
                </button>
              </div>
            </>
          ) : (
            <div className="flex gap-2">
              <a href="/login" className="acao-discreta flex-1 justify-center">Entrar</a>
              <a href="/cadastro" className="acao flex-1 text-center" style={{ textDecoration: 'none', padding: '0.42rem 0.75rem', fontSize: '0.8125rem' }}>
                Criar conta
              </a>
            </div>
          )}
        </div>
      </aside>

      {/* ============ CONTEÚDO ============ */}
      <main className="flex-1 min-w-0 p-5 lg:p-7">

        {/* números grandes */}
        {leads.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <Numero rotulo="empresas sem site" valor={leads.length} cor="var(--violeta)" />
            <Numero rotulo="ainda pendentes" valor={leads.length - contatados} cor="var(--coral)" />
            <Numero rotulo="já contatadas" valor={contatados} cor="var(--turquesa)" />
            <Numero rotulo="nota média" valor={mediaAval} cor="var(--ambar)" />
          </div>
        )}

        {/* gráficos */}
        {logado && leads.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <div className="cartao p-4 min-w-0">
              <p className="text-[13px] font-medium mb-3" style={{ color: 'var(--ink-2)' }}>
                Como as notas se distribuem
              </p>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={dadosAvaliacao}>
                  <XAxis dataKey="nome" tick={{ fill: cores.dim, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-2)' }}
                    contentStyle={{ background: cores.superficie, border: `1.5px solid ${cores.linha}`, borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                    {dadosAvaliacao.map((_, i) => <Cell key={i} fill={paleta[i % paleta.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="cartao p-4 min-w-0">
              <p className="text-[13px] font-medium mb-3" style={{ color: 'var(--ink-2)' }}>
                Quanto do trabalho já foi feito
              </p>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={[
                      { nome: 'contatadas', valor: contatados },
                      { nome: 'pendentes', valor: leads.length - contatados },
                    ]}
                    dataKey="valor" nameKey="nome"
                    innerRadius={42} outerRadius={64} paddingAngle={4} strokeWidth={0}
                  >
                    <Cell fill={cores.turquesa} />
                    <Cell fill={cores.coral} />
                  </Pie>
                  <Tooltip contentStyle={{ background: cores.superficie, border: `1.5px solid ${cores.linha}`, borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* barra de ferramentas */}
        {logado && leads.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <input
              className="campo flex-1 min-w-[180px] max-w-[280px]"
              style={{ fontSize: '0.8125rem', padding: '0.45rem 0.7rem' }}
              placeholder="Filtrar por nome, endereço ou etiqueta"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Filtrar"
            />
            <select
              className="campo"
              style={{ fontSize: '0.8125rem', padding: '0.45rem 0.7rem', width: 'auto' }}
              value={ordenar}
              onChange={(e) => setOrdenar(e.target.value as Ordenacao)}
              aria-label="Ordenar"
            >
              <option value="recentes">Mais recentes</option>
              <option value="nome">Nome</option>
              <option value="avaliacao">Melhor nota</option>
            </select>
            {[3, 4, 4.5].map((n) => (
              <button
                key={n}
                onClick={() => setNotaMin(notaMin === n ? 0 : n)}
                className="acao-discreta"
                data-ativo={notaMin === n ? '1' : '0'}
              >
                {n}+
              </button>
            ))}
            <button
              onClick={() => setSoNaoContatados((v) => !v)}
              className="acao-discreta"
              data-ativo={soNaoContatados ? '1' : '0'}
            >
              Pendentes
            </button>
            {comCoordenadas.length > 0 && (
              <button onClick={() => setVerMapa((v) => !v)} className="acao-discreta" data-ativo={verMapa ? '1' : '0'}>
                Mapa
              </button>
            )}
            <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
              <button onClick={exportarCSV} className="acao-discreta">Baixar CSV</button>
              <button onClick={() => setConfirmarLimpar(true)} className="acao-discreta" style={{ color: 'var(--danger)' }}>
                Apagar tudo
              </button>
            </div>
          </div>
        )}

        {/* mapa */}
        {logado && verMapa && comCoordenadas.length > 0 && (
          <div className="cartao overflow-hidden mb-5 h-[220px] sm:h-[300px]">
            <MapaLeads
              pontos={comCoordenadas}
              selecionado={selecionado}
              aoSelecionar={escolherLead}
              tema={tema}
            />
          </div>
        )}

        {/* resultados */}
        {leads.length === 0 && !carregando ? (
          <div className="cartao p-10 text-center max-w-[560px] mx-auto mt-8">
            <p className="destaque text-[26px] leading-tight mb-2">
              <span className="gradiente">Toda empresa sem site</span>
              <br />
              <span style={{ color: 'var(--ink)' }}>é um cliente esperando</span>
            </p>
            <p className="text-[14px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              Escolha um nicho e uma cidade ao lado. Trazemos só quem ainda não tem
              presença na internet, com telefone e endereço.
            </p>
          </div>
        ) : carregando && leads.length === 0 ? (
          <div className="cartao p-10 text-center max-w-[420px] mx-auto mt-8">
            <p className="text-[14px]" style={{ color: 'var(--ink-2)' }}>
              Consultando o Google Maps e separando quem ainda não tem site…
            </p>
          </div>
        ) : (
          <div className="relative">
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 270px), 1fr))',
                ...(visitante ? { filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none' } : {}),
              }}
            >
              {visiveis.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => escolherLead(lead.id)}
                  data-sel={selecionado === lead.id ? '1' : '0'}
                  className="cartao cartao-clicavel overflow-hidden"
                  style={{ opacity: lead.contatado ? 0.62 : 1 }}
                >
                  <div className={`faixa ${lead.contatado ? 'faixa-feito' : ''}`} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="destaque text-[15px] leading-snug" style={{ color: 'var(--ink)' }}>
                        {lead.nome}
                      </span>
                      {lead.avaliacao && (
                        <span
                          className="shrink-0 text-[12px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--ambar)', color: '#fff' }}
                        >
                          {lead.avaliacao}
                        </span>
                      )}
                    </div>
                    {lead.categoria && (
                      <p className="text-[12px] mb-1.5" style={{ color: 'var(--ink-3)' }}>{lead.categoria}</p>
                    )}
                    <p className="text-[12.5px] leading-snug mb-2.5" style={{ color: 'var(--ink-2)' }}>
                      {lead.endereco}
                    </p>
                    <p className="text-[13.5px] font-semibold" style={{ color: 'var(--violeta)' }}>
                      {lead.telefone}
                    </p>
                    {((lead.tags ?? []).length > 0 || lead.notas) && (
                      <div className="flex gap-1.5 mt-2.5 flex-wrap items-center">
                        {(lead.tags ?? []).slice(0, 3).map((t) => (
                          <span key={t} className="etiqueta">{t}</span>
                        ))}
                        {lead.notas && <IconeNota />}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {visiveis.length === 0 && (
              <div className="cartao p-8 text-center max-w-[420px] mx-auto">
                <p className="text-[14px]" style={{ color: 'var(--ink-2)' }}>
                  Nenhuma empresa com esses filtros. Baixe a nota mínima ou limpe o texto do filtro.
                </p>
              </div>
            )}

            {visitante && (
              <div className="absolute inset-0 flex items-start justify-center pt-16 px-4">
                <div className="cartao p-7 text-center max-w-[340px] w-full">
                  <p className="destaque gradiente text-[46px] leading-none mb-1">{leads.length}</p>
                  <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--ink)' }}>
                    empresas sem site nessa região
                  </p>
                  <p className="text-[13px] mb-5 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                    Crie uma conta para ver nomes, telefones e endereços.
                  </p>
                  <a href="/cadastro" className="acao block" style={{ textDecoration: 'none' }}>
                    Criar conta grátis
                  </a>
                  <a href="/login" className="block text-[13px] mt-3" style={{ color: 'var(--ink-2)' }}>
                    Já tenho conta
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ============ PAINEL DE DETALHE ============ */}
      {logado && leadAtual && (
        <>
          <div
            className="fixed inset-0 z-30 xl:hidden"
            style={{ background: 'rgba(13,10,26,.5)' }}
            onClick={() => setSelecionado(null)}
          />
          <aside
            className="fixed right-0 top-0 bottom-0 w-full max-w-[380px] z-40 overflow-auto"
            style={{ background: 'var(--surface)', borderLeft: '1.5px solid var(--line)' }}
            aria-label="Detalhes da empresa"
          >
            <div className="faixa" style={{ borderRadius: 0 }} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h2 className="destaque text-[20px] leading-tight" style={{ color: 'var(--ink)' }}>
                    {leadAtual.nome}
                  </h2>
                  {leadAtual.categoria && (
                    <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-3)' }}>{leadAtual.categoria}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelecionado(null)}
                  className="acao-discreta shrink-0"
                  style={{ padding: '0.3rem 0.6rem' }}
                >
                  Fechar
                </button>
              </div>

              <dl className="space-y-3 mb-4">
                <Dado rotulo="Telefone" valor={leadAtual.telefone} destaque />
                <Dado rotulo="Endereço" valor={leadAtual.endereco} />
                {leadAtual.avaliacao && (
                  <Dado
                    rotulo="Avaliação"
                    valor={`${leadAtual.avaliacao} de 5${leadAtual.total_avaliacoes ? `, ${leadAtual.total_avaliacoes} avaliações` : ''}`}
                  />
                )}
                {leadAtual.horario_funcionamento && (
                  <div>
                    <dt className="text-[12px] mb-1" style={{ color: 'var(--ink-3)' }}>Horário</dt>
                    <dd className="text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                      {leadAtual.horario_funcionamento.split(' | ').map((linha, i) => (
                        <span key={i} className="block">{linha}</span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="flex flex-wrap gap-2 mb-5">
                <button
                  onClick={() => alternarContato(leadAtual.id)}
                  className="acao-discreta"
                  data-ativo={leadAtual.contatado ? '1' : '0'}
                >
                  {leadAtual.contatado ? 'Contatado' : 'Marcar contatado'}
                </button>
                <a href={`https://wa.me/55${soDigitos(leadAtual.telefone)}`} target="_blank" rel="noopener noreferrer" className="acao-discreta">
                  WhatsApp
                </a>
                <button onClick={() => copiar(leadAtual.telefone, 'Telefone copiado')} className="acao-discreta">
                  Copiar telefone
                </button>
                {leadAtual.google_maps_url && (
                  <a href={leadAtual.google_maps_url} target="_blank" rel="noopener noreferrer" className="acao-discreta">
                    Ver no Maps
                  </a>
                )}
                <button onClick={() => copiar(textoParaPrompt(leadAtual), 'Resumo copiado')} className="acao-discreta">
                  Copiar resumo
                </button>
              </div>

              <div className="pt-4" style={{ borderTop: '1.5px solid var(--line)' }}>
                <label htmlFor="tags" className="block text-[12.5px] font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>
                  Etiquetas, separadas por vírgula
                </label>
                <input
                  id="tags"
                  className="campo mb-3"
                  style={{ fontSize: '0.8125rem' }}
                  placeholder="prioridade, retornar, ja falei"
                  value={rascunhoTags}
                  onChange={(e) => setRascunhoTags(e.target.value)}
                />

                <label htmlFor="nota" className="block text-[12.5px] font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>
                  Anotações
                </label>
                <textarea
                  id="nota"
                  className="campo mb-3"
                  rows={4}
                  style={{ fontSize: '0.8125rem', resize: 'vertical' }}
                  placeholder="O que combinaram, quando retornar, quem atende"
                  value={rascunhoNota}
                  onChange={(e) => setRascunhoNota(e.target.value)}
                />

                <button onClick={salvarNota} disabled={salvandoNota} className="acao">
                  {salvandoNota ? 'Salvando…' : 'Salvar anotação'}
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {aviso && (
        <div
          className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl text-[13px] font-medium z-50"
          style={{ background: 'var(--violeta)', color: '#fff', boxShadow: 'var(--sombra-cor)' }}
          role="status"
        >
          {aviso}
        </div>
      )}

      {confirmarLimpar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(13,10,26,.55)' }}
          onClick={() => setConfirmarLimpar(false)}
        >
          <div className="cartao w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="destaque text-[20px] mb-2" style={{ color: 'var(--ink)' }}>Apagar todos os leads</h2>
            <p className="text-[13.5px] mb-6 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              Isso remove as {leads.length} empresas salvas, junto das anotações e etiquetas.
              A ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmarLimpar(false)} className="acao-discreta">Cancelar</button>
              <button
                onClick={limparTudo}
                className="acao-discreta"
                style={{ background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }}
              >
                Apagar tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- peças ---------- */

function Numero({ rotulo, valor, cor }: { rotulo: string; valor: number | string; cor: string }) {
  return (
    <div className="cartao p-4 overflow-hidden min-w-0">
      <div className="destaque text-[30px] leading-none mb-1" style={{ color: cor }}>{valor}</div>
      <div className="text-[12.5px]" style={{ color: 'var(--ink-2)' }}>{rotulo}</div>
    </div>
  );
}

function Dado({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] mb-0.5" style={{ color: 'var(--ink-3)' }}>{rotulo}</dt>
      <dd
        className={destaque ? 'text-[15px] font-semibold' : 'text-[13.5px]'}
        style={{ color: destaque ? 'var(--violeta)' : 'var(--ink)' }}
      >
        {valor}
      </dd>
    </div>
  );
}

function IconeNota() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      className="shrink-0" style={{ color: 'var(--ink-3)' }} aria-label="tem anotação">
      <path d="M4 5h16M4 12h16M4 19h10" strokeLinecap="round" />
    </svg>
  );
}

function IconeLua() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" strokeLinejoin="round" />
    </svg>
  );
}

function IconeSol() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
