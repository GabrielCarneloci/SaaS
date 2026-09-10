'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const MapaLeads = dynamic(() => import('@/components/MapaLeads'), {
  ssr: false,
  loading: () => <div className="w-full h-full" style={{ background: 'var(--canvas)' }} />,
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
  const [menuConta, setMenuConta] = useState(false);

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
  const [listaAberta, setListaAberta] = useState(true);

  const [rascunhoNota, setRascunhoNota] = useState('');
  const [rascunhoTags, setRascunhoTags] = useState('');
  const [salvandoNota, setSalvandoNota] = useState(false);

  /* ---------- inicialização ---------- */

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
      setListaAberta(true);
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
  const comCoordenadas = useMemo(
    () => visiveis.filter((l) => l.latitude != null && l.longitude != null),
    [visiveis]
  );

  const escolherLead = useCallback((id: number) => setSelecionado(id), []);
  const visitante = logado === false;

  return (
    <div className="h-screen w-screen relative overflow-hidden" style={{ background: 'var(--canvas)' }}>

      {/* ===== MAPA: ocupa a tela toda, é o fundo de tudo ===== */}
      <div className="absolute inset-0">
        <MapaLeads
          pontos={comCoordenadas}
          selecionado={selecionado}
          aoSelecionar={escolherLead}
          tema={tema}
          aberturaLateral={listaAberta ? 400 : 60}
        />
      </div>

      {/* ===== BARRA DE BUSCA FLUTUANTE ===== */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-start gap-3 pointer-events-none">
        <div className="flutua flutua-alta p-2 flex items-center gap-2 flex-wrap pointer-events-auto">
          <span className="serifa text-[21px] px-2.5 leading-none" style={{ color: 'var(--ink)' }}>
            Radar
          </span>
          <span className="w-px h-6" style={{ background: 'var(--line)' }} />

          <input
            className="campo w-[150px]"
            placeholder="Nicho"
            value={nicho}
            onChange={(e) => setNicho(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarLeads()}
            aria-label="Nicho"
          />
          <select
            className="campo w-[110px]"
            value={uf}
            onChange={(e) => selecionarUf(e.target.value)}
            aria-label="Estado"
          >
            <option value="">Estado</option>
            {estados.map((e) => <option key={e.sigla} value={e.sigla}>{e.sigla}</option>)}
          </select>
          <select
            className="campo w-[170px]"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            disabled={!uf || carregandoCidades}
            aria-label="Cidade"
          >
            <option value="">
              {carregandoCidades ? 'Carregando' : uf ? 'Cidade' : 'Escolha o estado'}
            </option>
            {cidades.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <button onClick={buscarLeads} disabled={carregando} className="acao acao-latao">
            {carregando ? 'Buscando' : 'Buscar'}
          </button>
        </div>

        {/* conta e tema, à direita */}
        <div className="ml-auto flex items-center gap-2 pointer-events-auto relative">
          <button onClick={alternarTema} className="flutua p-2.5" aria-label="Alternar tema" title="Alternar tema"
            style={{ color: 'var(--ink-2)', cursor: 'pointer' }}>
            {tema === 'claro' ? <IconeLua /> : <IconeSol />}
          </button>

          {logado ? (
            <>
              <button onClick={() => setMenuConta((v) => !v)} className="flutua px-3 py-2 text-[13px]"
                style={{ color: 'var(--ink-2)', cursor: 'pointer' }}>
                {emailUsuario.split('@')[0]}
              </button>
              {menuConta && (
                <div className="flutua flutua-alta absolute right-0 top-12 w-52 p-1.5 z-30">
                  {ehAdmin && (
                    <a href="/admin" className="block px-3 py-2 rounded-lg text-[13px]" style={{ color: 'var(--ink)' }}>
                      Painel do administrador
                    </a>
                  )}
                  <button onClick={sair} className="w-full text-left px-3 py-2 rounded-lg text-[13px]"
                    style={{ color: 'var(--ink)' }}>
                    Sair da conta
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <a href="/login" className="flutua px-3 py-2 text-[13px]" style={{ color: 'var(--ink-2)' }}>Entrar</a>
              <a href="/cadastro" className="acao acao-latao" style={{ textDecoration: 'none', padding: '0.6rem 1rem' }}>
                Criar conta
              </a>
            </>
          )}
        </div>
      </div>

      {erro && (
        <div className="absolute top-24 left-4 z-30 flutua px-3.5 py-2.5 text-[13px] max-w-[320px]"
          style={{ color: 'var(--danger)', background: 'var(--danger-wash)' }}>
          {erro}
        </div>
      )}

      {/* ===== PAINEL DE RESULTADOS, FLUTUANDO À ESQUERDA ===== */}
      {leads.length > 0 && (
        listaAberta ? (
          <section
            className="absolute left-4 top-24 bottom-4 w-[368px] z-10 flutua flutua-alta flex flex-col overflow-hidden"
            aria-label="Empresas encontradas"
          >
            {/* cabeçalho do painel: número em serifa */}
            <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--line)' }}>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <span className="serifa block leading-[0.95] text-[46px]" style={{ color: 'var(--ink)' }}>
                    {visiveis.length}
                  </span>
                  <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>
                    {visiveis.length === 1 ? 'empresa sem site' : 'empresas sem site'}
                    {visiveis.length !== leads.length && ` de ${leads.length}`}
                  </span>
                </div>
                <button onClick={() => setListaAberta(false)} className="acao-discreta" aria-label="Recolher lista">
                  Recolher
                </button>
              </div>

              {logado && leads.length > 0 && (
                <>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
                      {contatados} já contatadas
                    </span>
                    <span className="text-[12.5px]" style={{ color: 'var(--ink-3)' }}>{progresso}%</span>
                  </div>
                  <div className="h-[3px] rounded-full overflow-hidden mb-3" style={{ background: 'var(--line)' }}>
                    <div className="h-full rounded-full" style={{ width: `${progresso}%`, background: 'var(--brass)' }} />
                  </div>

                  <input
                    className="campo mb-2"
                    style={{ fontSize: '0.8125rem' }}
                    placeholder="Filtrar por nome, endereço ou etiqueta"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    aria-label="Filtrar"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <select
                      className="campo"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.45rem', width: 'auto' }}
                      value={ordenar}
                      onChange={(e) => setOrdenar(e.target.value as Ordenacao)}
                      aria-label="Ordenar"
                    >
                      <option value="recentes">Recentes</option>
                      <option value="nome">Nome</option>
                      <option value="avaliacao">Melhor nota</option>
                    </select>
                    {[3, 4, 4.5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setNotaMin(notaMin === n ? 0 : n)}
                        className="acao-discreta"
                        data-ativo={notaMin === n ? '1' : '0'}
                        style={{ fontSize: '0.75rem', padding: '0.28rem 0.5rem' }}
                      >
                        {n}+
                      </button>
                    ))}
                    <button
                      onClick={() => setSoNaoContatados((v) => !v)}
                      className="acao-discreta"
                      data-ativo={soNaoContatados ? '1' : '0'}
                      style={{ fontSize: '0.75rem', padding: '0.28rem 0.5rem' }}
                    >
                      Pendentes
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* lista */}
            <div className="flex-1 overflow-auto p-2 relative">
              <div style={visitante ? { filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none' } : undefined}>
                {visiveis.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => escolherLead(lead.id)}
                    data-sel={selecionado === lead.id ? '1' : '0'}
                    className="registro"
                    style={{ opacity: lead.contatado ? 0.48 : 1 }}
                  >
                    <span className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13.5px] truncate" style={{ color: 'var(--ink)' }}>{lead.nome}</span>
                      {lead.notas && <IconeNota />}
                    </span>
                    <span className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--ink-3)' }}>
                      <span className="truncate flex-1">{lead.endereco}</span>
                      {lead.avaliacao && <span className="shrink-0">{lead.avaliacao} ★</span>}
                    </span>
                    {(lead.tags ?? []).length > 0 && (
                      <span className="flex gap-1 mt-1.5 flex-wrap">
                        {(lead.tags ?? []).slice(0, 3).map((t) => (
                          <span key={t} className="etiqueta">{t}</span>
                        ))}
                      </span>
                    )}
                  </button>
                ))}
                {visiveis.length === 0 && (
                  <p className="text-[13px] text-center py-10 px-4" style={{ color: 'var(--ink-2)' }}>
                    Nenhuma empresa com esses filtros. Ajuste a nota mínima ou limpe o texto do filtro.
                  </p>
                )}
              </div>

              {visitante && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="flutua flutua-alta p-6 text-center w-full">
                    <p className="serifa text-[42px] leading-none mb-1" style={{ color: 'var(--ink)' }}>
                      {leads.length}
                    </p>
                    <p className="text-[13.5px] mb-1" style={{ color: 'var(--ink)' }}>
                      empresas sem site nessa região
                    </p>
                    <p className="text-[12.5px] mb-4 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                      Crie uma conta para ver nomes, telefones e onde cada uma fica.
                    </p>
                    <a href="/cadastro" className="acao acao-latao block" style={{ textDecoration: 'none' }}>
                      Criar conta grátis
                    </a>
                    <a href="/login" className="block text-[12.5px] mt-2.5" style={{ color: 'var(--ink-2)' }}>
                      Já tenho conta
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* rodapé do painel */}
            {logado && (
              <div className="px-3 py-2.5 flex items-center gap-2" style={{ borderTop: '1px solid var(--line)' }}>
                <button onClick={exportarCSV} className="acao-discreta">Baixar CSV</button>
                <button onClick={() => setConfirmarLimpar(true)} className="acao-discreta" style={{ color: 'var(--danger)' }}>
                  Apagar tudo
                </button>
              </div>
            )}
          </section>
        ) : (
          <button
            onClick={() => setListaAberta(true)}
            className="absolute left-4 top-24 z-10 flutua flutua-alta px-4 py-3 text-left"
            style={{ cursor: 'pointer' }}
          >
            <span className="serifa block text-[28px] leading-none" style={{ color: 'var(--ink)' }}>
              {visiveis.length}
            </span>
            <span className="text-[12px]" style={{ color: 'var(--ink-2)' }}>ver lista</span>
          </button>
        )
      )}

      {/* ===== ESTADO INICIAL, CENTRALIZADO SOBRE O MAPA ===== */}
      {leads.length === 0 && !carregando && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none px-6">
          <div className="flutua flutua-alta px-8 py-7 max-w-[380px] text-center pointer-events-auto">
            <p className="serifa text-[27px] leading-tight mb-2" style={{ color: 'var(--ink)' }}>
              Toda empresa sem site é um cliente esperando
            </p>
            <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              Escolha um nicho e uma cidade na barra acima. O mapa mostra onde estão as que ainda
              não têm presença na internet.
            </p>
          </div>
        </div>
      )}

      {carregando && leads.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="flutua flutua-alta px-6 py-4">
            <p className="text-[13.5px]" style={{ color: 'var(--ink-2)' }}>
              Consultando o Google Maps e separando quem ainda não tem site
            </p>
          </div>
        </div>
      )}

      {/* ===== FOLHA DE DETALHE, À DIREITA ===== */}
      {logado && leadAtual && (
        <aside
          className="absolute right-4 top-24 bottom-4 w-[350px] z-20 flutua flutua-alta folha overflow-auto"
          aria-label="Detalhes da empresa"
        >
          <div className="p-5">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <h2 className="serifa text-[24px] leading-tight" style={{ color: 'var(--ink)' }}>
                  {leadAtual.nome}
                </h2>
                {leadAtual.categoria && (
                  <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-3)' }}>{leadAtual.categoria}</p>
                )}
              </div>
              <button onClick={() => setSelecionado(null)} className="acao-discreta shrink-0"
                style={{ padding: '0.25rem 0.5rem' }} aria-label="Fechar detalhes">
                Fechar
              </button>
            </div>

            <dl className="space-y-2.5 mb-4">
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
                  <dt className="text-[12px] mb-0.5" style={{ color: 'var(--ink-3)' }}>Horário</dt>
                  <dd className="text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                    {leadAtual.horario_funcionamento.split(' | ').map((linha, i) => (
                      <span key={i} className="block">{linha}</span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>

            <div className="flex flex-wrap gap-1.5 mb-4">
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

            <div className="pt-4" style={{ borderTop: '1px solid var(--line)' }}>
              <label htmlFor="tags" className="block text-[12px] mb-1.5" style={{ color: 'var(--ink-2)' }}>
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

              <label htmlFor="nota" className="block text-[12px] mb-1.5" style={{ color: 'var(--ink-2)' }}>
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

              <button onClick={salvarNota} disabled={salvandoNota} className="acao w-full">
                {salvandoNota ? 'Salvando' : 'Salvar anotação'}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* histórico, canto inferior esquerdo quando a lista está recolhida */}
      {logado && historico.length > 0 && !listaAberta && (
        <div className="absolute left-4 bottom-4 z-10 flutua p-3 w-[290px]">
          <p className="text-[12px] mb-1.5" style={{ color: 'var(--ink-3)' }}>Buscas anteriores</p>
          {historico.slice(0, 5).map((h) => (
            <button
              key={h.id}
              onClick={() => repetirBusca(h)}
              className="w-full text-left px-2 py-1.5 rounded-lg text-[12.5px] flex justify-between gap-2"
              style={{ color: 'var(--ink-2)' }}
            >
              <span className="truncate">{h.nicho}, {h.localidade}</span>
              <span style={{ color: 'var(--ink-3)' }}>{h.total}</span>
            </button>
          ))}
        </div>
      )}

      {aviso && (
        <div
          className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-[13px] z-50"
          style={{ background: 'var(--ink)', color: 'var(--canvas)' }}
          role="status"
        >
          {aviso}
        </div>
      )}

      {confirmarLimpar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(10,12,10,0.5)' }}
          onClick={() => setConfirmarLimpar(false)}
        >
          <div className="w-full max-w-sm rounded-2xl p-6 flutua flutua-alta" onClick={(e) => e.stopPropagation()}>
            <h2 className="serifa text-[22px] mb-2" style={{ color: 'var(--ink)' }}>Apagar todos os leads</h2>
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

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-[12px] mb-0.5" style={{ color: 'var(--ink-3)' }}>{rotulo}</dt>
      <dd className="text-[13.5px] leading-snug" style={{ color: 'var(--ink)' }}>{valor}</dd>
    </div>
  );
}

function IconeNota() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      className="shrink-0" style={{ color: 'var(--brass)' }} aria-label="tem anotação">
      <path d="M4 5h16M4 12h16M4 19h10" strokeLinecap="round" />
    </svg>
  );
}

function IconeLua() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" strokeLinejoin="round" />
    </svg>
  );
}

function IconeSol() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
