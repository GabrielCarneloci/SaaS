'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

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
  const [verMapa, setVerMapa] = useState(true);

  const [rascunhoNota, setRascunhoNota] = useState('');
  const [rascunhoTags, setRascunhoTags] = useState('');
  const [salvandoNota, setSalvandoNota] = useState(false);

  /* ---------------- carregamento inicial ---------------- */

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

  /* ---------------- ações ---------------- */

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

  /* ---------------- derivados ---------------- */

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
  const comCoordenadas = useMemo(
    () => visiveis.filter((l) => l.latitude != null && l.longitude != null),
    [visiveis]
  );

  const escolherLead = useCallback((id: number) => setSelecionado(id), []);

  /* ---------------- render ---------------- */

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--canvas)' }}>

      {/* ========== RAIL DE BUSCA ========== */}
      <aside
        className="w-[300px] shrink-0 hidden lg:flex flex-col relative"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--line)' }}
      >
        <div className="absolute inset-x-0 top-0 h-40 papel pointer-events-none" />

        <div className="relative px-6 pt-6 pb-5">
          <div className="flex items-center justify-between mb-6">
            <span className="display text-[19px]" style={{ color: 'var(--ink)' }}>Radar</span>
            <button
              onClick={alternarTema}
              className="acao-discreta"
              style={{ padding: '5px 8px' }}
              aria-label={tema === 'claro' ? 'Usar tema escuro' : 'Usar tema claro'}
              title={tema === 'claro' ? 'Usar tema escuro' : 'Usar tema claro'}
            >
              {tema === 'claro' ? <IconeLua /> : <IconeSol />}
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="nicho" className="block text-[13px] mb-1.5" style={{ color: 'var(--ink-2)' }}>
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
              <label htmlFor="uf" className="block text-[13px] mb-1.5" style={{ color: 'var(--ink-2)' }}>
                Estado
              </label>
              <select id="uf" className="campo" value={uf} onChange={(e) => selecionarUf(e.target.value)}>
                <option value="">Escolha um estado</option>
                {estados.map((e) => <option key={e.sigla} value={e.sigla}>{e.nome}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="cidade" className="block text-[13px] mb-1.5" style={{ color: 'var(--ink-2)' }}>
                Cidade
              </label>
              <select
                id="cidade"
                className="campo"
                value={cidade}
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
              {carregando ? 'Buscando' : 'Buscar empresas'}
            </button>

            {erro && (
              <p className="text-[13px] px-3 py-2 rounded" style={{ background: 'var(--danger-wash)', color: 'var(--danger)' }}>
                {erro}
              </p>
            )}
          </div>
        </div>

        {logado && leads.length > 0 && (
          <div className="px-6 py-4" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>
                {contatados} de {leads.length} contatados
              </span>
              <span className="display text-[15px]" style={{ color: 'var(--ink)' }}>{progresso}%</span>
            </div>
            <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
              <div className="h-full rounded-full" style={{ width: `${progresso}%`, background: 'var(--accent)' }} />
            </div>
          </div>
        )}

        {logado && historico.length > 0 && (
          <div className="px-6 py-4 flex-1 overflow-auto" style={{ borderTop: '1px solid var(--line)' }}>
            <p className="text-[13px] mb-2.5" style={{ color: 'var(--ink-2)' }}>Buscas anteriores</p>
            <div className="space-y-0.5">
              {historico.slice(0, 8).map((h) => (
                <button
                  key={h.id}
                  onClick={() => repetirBusca(h)}
                  className="w-full text-left px-2 py-1.5 rounded text-[13px] flex items-baseline justify-between gap-2"
                  style={{ color: 'var(--ink-2)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="truncate">
                    {h.nicho} <span style={{ color: 'var(--ink-3)' }}>em {h.localidade}</span>
                  </span>
                  <span style={{ color: 'var(--ink-3)' }}>{h.total}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto px-6 py-4" style={{ borderTop: '1px solid var(--line)' }}>
          {logado ? (
            <>
              {ehAdmin && (
                <a href="/admin" className="block text-[13px] mb-2.5" style={{ color: 'var(--accent)' }}>
                  Painel do administrador
                </a>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] truncate" style={{ color: 'var(--ink-3)' }}>{emailUsuario}</span>
                <button onClick={sair} className="text-[13px] shrink-0" style={{ color: 'var(--ink-2)' }}>Sair</button>
              </div>
            </>
          ) : (
            <div className="flex gap-2">
              <a href="/login" className="acao-discreta flex-1 justify-center" style={{ textDecoration: 'none' }}>Entrar</a>
              <a
                href="/cadastro"
                className="acao flex-1 text-center"
                style={{ padding: '0.4rem 0.7rem', fontSize: '0.8125rem', textDecoration: 'none', width: 'auto' }}
              >
                Criar conta
              </a>
            </div>
          )}
        </div>
      </aside>

      {/* ========== LEDGER ========== */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header
          className="px-5 lg:px-6 py-3 flex items-center gap-3 flex-wrap shrink-0"
          style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}
        >
          <h1 className="display text-[17px] mr-1" style={{ color: 'var(--ink)' }}>
            {visiveis.length} {visiveis.length === 1 ? 'empresa' : 'empresas'}
            {visiveis.length !== leads.length && (
              <span className="text-[14px]" style={{ color: 'var(--ink-3)' }}> de {leads.length}</span>
            )}
          </h1>

          {logado && leads.length > 0 && (
            <>
              <input
                className="campo flex-1 min-w-[150px] max-w-[240px]"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.8125rem' }}
                placeholder="Filtrar por nome, endereço ou etiqueta"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                aria-label="Filtrar resultados"
              />
              <select
                className="campo"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.8125rem', width: 'auto' }}
                value={ordenar}
                onChange={(e) => setOrdenar(e.target.value as Ordenacao)}
                aria-label="Ordenar por"
              >
                <option value="recentes">Mais recentes</option>
                <option value="nome">Nome</option>
                <option value="avaliacao">Melhor avaliadas</option>
              </select>
              <div className="flex rounded overflow-hidden" style={{ border: '1px solid var(--line-2)' }}>
                {[0, 3, 4, 4.5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNotaMin(n)}
                    className="px-2.5 py-1.5 text-[13px]"
                    style={{
                      background: notaMin === n ? 'var(--accent)' : 'transparent',
                      color: notaMin === n ? 'var(--accent-ink)' : 'var(--ink-2)',
                    }}
                  >
                    {n === 0 ? 'Todas' : `${n}+`}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setSoNaoContatados((v) => !v)}
                className="acao-discreta"
                style={soNaoContatados ? { background: 'var(--accent)', color: 'var(--accent-ink)', borderColor: 'var(--accent)' } : undefined}
              >
                Pendentes
              </button>

              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => setVerMapa((v) => !v)} className="acao-discreta">
                  {verMapa ? 'Ocultar mapa' : 'Ver mapa'}
                </button>
                <button onClick={exportarCSV} className="acao-discreta">Baixar CSV</button>
                <button onClick={() => setConfirmarLimpar(true)} className="acao-discreta" style={{ color: 'var(--danger)' }}>
                  Apagar tudo
                </button>
              </div>
            </>
          )}
        </header>

        <div className="flex-1 flex min-h-0">
          <div className="flex-1 min-w-0 overflow-auto relative">
            {carregando && leads.length === 0 ? (
              <Vazio titulo="Buscando empresas" texto="Consultando o Google Maps e separando quem ainda não tem site." />
            ) : visiveis.length === 0 ? (
              <Vazio
                titulo={leads.length ? 'Nenhuma empresa com esses filtros' : 'Comece uma busca'}
                texto={leads.length
                  ? 'Ajuste os filtros no topo para ver mais resultados.'
                  : 'Escolha um nicho e uma cidade no painel à esquerda.'}
              />
            ) : (
              <div style={logado === false ? { filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none' } : undefined}>
                {visiveis.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => escolherLead(lead.id)}
                    data-sel={selecionado === lead.id ? '1' : '0'}
                    className="linha"
                    style={{ gridTemplateColumns: 'minmax(0,1fr) auto', opacity: lead.contatado ? 0.5 : 1 }}
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-[14px] truncate" style={{ color: 'var(--ink)' }}>{lead.nome}</span>
                        {(lead.tags ?? []).slice(0, 2).map((t) => (
                          <span key={t} className="etiqueta shrink-0">{t}</span>
                        ))}
                        {lead.notas && <IconeNota />}
                      </span>
                      <span className="block text-[12.5px] truncate mt-0.5" style={{ color: 'var(--ink-3)' }}>
                        {lead.endereco}
                      </span>
                    </span>
                    <span className="flex items-center gap-4 pl-4">
                      <span className="text-[13px] w-14 text-right" style={{ color: lead.avaliacao ? 'var(--ink-2)' : 'var(--ink-3)' }}>
                        {lead.avaliacao ? `${lead.avaliacao} ★` : '—'}
                      </span>
                      <span className="text-[13px] hidden sm:block" style={{ color: 'var(--ink-2)' }}>{lead.telefone}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {logado === false && leads.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center px-6">
                <div
                  className="max-w-[320px] w-full p-7 rounded-lg text-center"
                  style={{ background: 'var(--surface)', border: '1px solid var(--line-2)' }}
                >
                  <p className="display text-[34px] leading-none mb-1.5" style={{ color: 'var(--ink)' }}>{leads.length}</p>
                  <p className="text-[14px] mb-1" style={{ color: 'var(--ink)' }}>empresas sem site nessa região</p>
                  <p className="text-[13px] mb-5" style={{ color: 'var(--ink-2)' }}>
                    Crie uma conta para ver nomes, telefones e endereços.
                  </p>
                  <a href="/cadastro" className="acao block text-center" style={{ textDecoration: 'none' }}>
                    Criar conta grátis
                  </a>
                  <a href="/login" className="block text-[13px] mt-3" style={{ color: 'var(--ink-2)' }}>
                    Já tenho conta
                  </a>
                </div>
              </div>
            )}
          </div>

          {logado && leadAtual && (
            <aside
              className="w-[340px] shrink-0 hidden xl:flex flex-col overflow-auto"
              style={{ borderLeft: '1px solid var(--line)', background: 'var(--surface)' }}
            >
              {verMapa && (
                <div className="h-[190px] shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
                  <MapaLeads pontos={comCoordenadas} selecionado={selecionado} aoSelecionar={escolherLead} />
                </div>
              )}

              <div className="p-5">
                <h2 className="display text-[20px] leading-snug mb-1" style={{ color: 'var(--ink)' }}>
                  {leadAtual.nome}
                </h2>
                {leadAtual.categoria && (
                  <p className="text-[13px] mb-3" style={{ color: 'var(--ink-3)' }}>{leadAtual.categoria}</p>
                )}

                <dl className="space-y-2.5 mb-5">
                  <Dado rotulo="Telefone" valor={leadAtual.telefone} />
                  <Dado rotulo="Endereço" valor={leadAtual.endereco} />
                  {leadAtual.avaliacao && (
                    <Dado
                      rotulo="Avaliação"
                      valor={`${leadAtual.avaliacao} de 5${leadAtual.total_avaliacoes ? `, ${leadAtual.total_avaliacoes} avaliações` : ''}`}
                    />
                  )}
                  {leadAtual.horario_funcionamento && (
                    <div>
                      <dt className="text-[12.5px] mb-0.5" style={{ color: 'var(--ink-3)' }}>Horário</dt>
                      <dd className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
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
                    style={leadAtual.contatado ? { background: 'var(--accent-wash)', borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
                  >
                    {leadAtual.contatado ? 'Contatado' : 'Marcar contatado'}
                  </button>
                  <a
                    href={`https://wa.me/55${soDigitos(leadAtual.telefone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="acao-discreta"
                    style={{ textDecoration: 'none' }}
                  >
                    WhatsApp
                  </a>
                  <button onClick={() => copiar(leadAtual.telefone, 'Telefone copiado')} className="acao-discreta">
                    Copiar telefone
                  </button>
                  {leadAtual.google_maps_url && (
                    <a
                      href={leadAtual.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="acao-discreta"
                      style={{ textDecoration: 'none' }}
                    >
                      Google Maps
                    </a>
                  )}
                  <button onClick={() => copiar(textoParaPrompt(leadAtual), 'Resumo copiado')} className="acao-discreta">
                    Copiar resumo
                  </button>
                </div>

                <div style={{ borderTop: '1px solid var(--line)' }} className="pt-4">
                  <label htmlFor="tags" className="block text-[12.5px] mb-1.5" style={{ color: 'var(--ink-2)' }}>
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

                  <label htmlFor="nota" className="block text-[12.5px] mb-1.5" style={{ color: 'var(--ink-2)' }}>
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
                    {salvandoNota ? 'Salvando' : 'Salvar anotação'}
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>

      {aviso && (
        <div
          className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded text-[13px] z-50"
          style={{ background: 'var(--ink)', color: 'var(--canvas)' }}
          role="status"
        >
          {aviso}
        </div>
      )}

      {confirmarLimpar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(10,14,13,0.45)' }}
          onClick={() => setConfirmarLimpar(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--line-2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="display text-[19px] mb-2" style={{ color: 'var(--ink)' }}>Apagar todos os leads</h2>
            <p className="text-[13.5px] mb-6 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              Isso remove as {leads.length} empresas salvas, junto das anotações e etiquetas. A ação não pode ser desfeita.
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

/* ---------------- peças ---------------- */

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-[12.5px] mb-0.5" style={{ color: 'var(--ink-3)' }}>{rotulo}</dt>
      <dd className="text-[13.5px] leading-snug" style={{ color: 'var(--ink)' }}>{valor}</dd>
    </div>
  );
}

function Vazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center px-8">
      <p className="display text-[19px] mb-1.5" style={{ color: 'var(--ink)' }}>{titulo}</p>
      <p className="text-[13.5px] max-w-[300px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>{texto}</p>
    </div>
  );
}

function IconeNota() {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      className="shrink-0" style={{ color: 'var(--ink-3)' }} aria-label="tem anotação"
    >
      <path d="M4 5h16M4 12h16M4 19h10" strokeLinecap="round" />
    </svg>
  );
}

function IconeLua() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" strokeLinejoin="round" />
    </svg>
  );
}

function IconeSol() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
