'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  Botao, Campo, Seletor, Aviso, Etiqueta, Modal, Skeleton, SkeletonCartao,
  EstadoVazio, Toast, Progresso,
} from '@/components/ui';
import { useTema } from '@/components/useTema';
import {
  IconeBusca, IconePainel, IconeConta, IconeEscudo, IconeSair, IconeLua, IconeSol,
  IconeCopiar, IconeCheck, IconeBaixar, IconeLixeira, IconeMapa, IconeFechar,
  IconeNota, IconeEstrela, IconeWhatsapp, IconeMenu, IconeHistorico,
} from '@/components/Icones';

const MapaLeads = dynamic(() => import('@/components/MapaLeads'), {
  ssr: false,
  loading: () => <div className="w-full h-full skeleton" style={{ borderRadius: 0 }} />,
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
  mensagem_ia: string | null;
  resumo_ia: string | null;
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
  const { tema, alternarTema } = useTema();

  const [logado, setLogado] = useState<boolean | null>(null);
  const [emailUsuario, setEmailUsuario] = useState('');
  const [ehAdmin, setEhAdmin] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

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
  const [carregandoInicial, setCarregandoInicial] = useState(true);
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
  const [gerandoIA, setGerandoIA] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  /* ---------------- carregamento ---------------- */

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
        if (!data.usuario.email_verificado) {
          router.push('/verifique-seu-email');
          return;
        }
        setLogado(true);
        setEmailUsuario(data.usuario.email);
        setEhAdmin(data.usuario.is_admin);
        await carregarLeads();
        carregarHistorico();
      } else {
        setLogado(false);
      }
    } catch {
      setLogado(false);
    } finally {
      setCarregandoInicial(false);
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
    setMenuAberto(false);
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
            notas: null, tags: null, mensagem_ia: null, resumo_ia: null,
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

  async function gerarComIA(forcar: boolean) {
    if (selecionado == null) return;
    setGerandoIA(true);
    try {
      const res = await fetch('/api/leads/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selecionado, forcar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro);
      setLeads((p) =>
        p.map((l) => (l.id === selecionado ? { ...l, mensagem_ia: data.mensagem, resumo_ia: data.resumo } : l))
      );
      mostrarAviso(data.doCache ? 'Mostrando o texto já gerado' : 'Texto gerado');
    } catch (e: any) {
      mostrarAviso(e.message || 'Não foi possível gerar agora');
    } finally {
      setGerandoIA(false);
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

  function copiar(texto: string, chave: string, confirmacao: string) {
    navigator.clipboard.writeText(texto);
    setCopiado(chave);
    setTimeout(() => setCopiado(null), 1600);
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
    if (notaMin > 0) r = r.filter((l) => (Number(l.avaliacao) || 0) >= notaMin);
    if (soNaoContatados) r = r.filter((l) => !l.contatado);
    if (ordenar === 'nome') r.sort((a, b) => a.nome.localeCompare(b.nome));
    else if (ordenar === 'avaliacao') r.sort((a, b) => (Number(b.avaliacao) || 0) - (Number(a.avaliacao) || 0));
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
    const faixas: Record<string, number> = { 'até 3': 0, '3 a 4': 0, '4 a 4,5': 0, 'acima de 4,5': 0, 'sem nota': 0 };
    leads.forEach((l) => {
      const n = Number(l.avaliacao) || 0;
      if (!l.avaliacao) faixas['sem nota']++;
      else if (n < 3) faixas['até 3']++;
      else if (n < 4) faixas['3 a 4']++;
      else if (n < 4.5) faixas['4 a 4,5']++;
      else faixas['acima de 4,5']++;
    });
    return Object.entries(faixas).map(([nome, valor]) => ({ nome, valor }));
  }, [leads]);

  const escolherLead = useCallback((id: number) => setSelecionado(id), []);
  const visitante = logado === false;
  const temFiltro = Boolean(busca) || notaMin > 0 || soNaoContatados;

  const corEixo = tema === 'escuro' ? '#67748a' : '#8592a6';
  const corGrade = tema === 'escuro' ? '#212c3a' : '#e4e9f0';
  const corFundo = tema === 'escuro' ? '#131a25' : '#ffffff';
  const paletaBarras = tema === 'escuro'
    ? ['#3b82f6', '#5b9bf8', '#7cb0fa', '#9cc5fb', '#67748a']
    : ['#1d4ed8', '#2563eb', '#3b82f6', '#93c5fd', '#8592a6'];

  /* ---------------- render ---------------- */

  const conteudoBarraLateral = (
    <>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--marca-1)' }}>
            <IconePainel tamanho={15} style={{ color: '#fff' }} />
          </div>
          <span className="t-secao" style={{ fontSize: '0.9375rem' }}>Radar de Leads</span>
          <button
            className="btn btn-fantasma btn-icone ml-auto lg:hidden"
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar menu"
          >
            <IconeFechar tamanho={15} />
          </button>
        </div>

        <div className="space-y-3">
          <Campo
            id="nicho"
            rotulo="Nicho"
            placeholder="barbearia, dentista, pizzaria"
            value={nicho}
            onChange={(e) => setNicho(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarLeads()}
          />
          <Seletor id="uf" rotulo="Estado" value={uf} onChange={(e) => selecionarUf(e.target.value)}>
            <option value="">Escolha um estado</option>
            {estados.map((e) => <option key={e.sigla} value={e.sigla}>{e.nome}</option>)}
          </Seletor>
          <Seletor
            id="cidade"
            rotulo="Cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            disabled={!uf || carregandoCidades}
          >
            <option value="">
              {carregandoCidades ? 'Carregando cidades' : uf ? 'Escolha uma cidade' : 'Escolha o estado antes'}
            </option>
            {cidades.map((c) => <option key={c} value={c}>{c}</option>)}
          </Seletor>

          <Botao variante="principal" tamanho="g" bloco carregando={carregando} onClick={buscarLeads}>
            <IconeBusca tamanho={15} />
            Buscar empresas
          </Botao>

          {erro && <Aviso tom="erro">{erro}</Aviso>}
        </div>
      </div>

      {logado && leads.length > 0 && (
        <>
          <hr className="divisor" />
          <div className="p-4">
            <div className="flex items-baseline justify-between mb-2">
              <span className="t-apoio">{contatados} de {leads.length} contatadas</span>
              <span className="t-numero text-[0.9375rem]" style={{ color: 'var(--ok)' }}>{progresso}%</span>
            </div>
            <Progresso valor={progresso} tom="ok" />
          </div>
        </>
      )}

      {logado && historico.length > 0 && (
        <>
          <hr className="divisor" />
          <div className="p-4 flex-1 overflow-auto max-h-[15rem] lg:max-h-none">
            <p className="nav-grupo flex items-center gap-1.5" style={{ padding: 0 }}>
              <IconeHistorico tamanho={12} />
              Buscas anteriores
            </p>
            <div className="space-y-0.5 mt-2">
              {historico.slice(0, 8).map((h) => (
                <button key={h.id} onClick={() => repetirBusca(h)} className="nav-item">
                  <span className="truncate flex-1">{h.nicho}</span>
                  <span className="t-nota shrink-0">{h.total}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="mt-auto">
        <hr className="divisor" />
        <div className="p-3">
          {logado ? (
            <>
              <a href="/perfil" className="nav-item"><IconeConta tamanho={15} />Sua conta</a>
              {ehAdmin && <a href="/admin" className="nav-item"><IconeEscudo tamanho={15} />Administração</a>}
              <button onClick={alternarTema} className="nav-item">
                {tema === 'claro' ? <IconeLua tamanho={15} /> : <IconeSol tamanho={15} />}
                {tema === 'claro' ? 'Tema escuro' : 'Tema claro'}
              </button>
              <button onClick={sair} className="nav-item"><IconeSair tamanho={15} />Sair</button>
              <p className="t-nota truncate px-2.5 pt-2">{emailUsuario}</p>
            </>
          ) : (
            <>
              <button onClick={alternarTema} className="nav-item mb-2">
                {tema === 'claro' ? <IconeLua tamanho={15} /> : <IconeSol tamanho={15} />}
                {tema === 'claro' ? 'Tema escuro' : 'Tema claro'}
              </button>
              <div className="flex gap-2">
                <a href="/login" className="btn btn-secundario flex-1">Entrar</a>
                <a href="/cadastro" className="btn btn-principal flex-1">Criar conta</a>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex overflow-x-hidden" style={{ background: 'var(--canvas)' }}>

      {/* ===== BARRA LATERAL ===== */}
      <aside
        className="hidden lg:flex w-[17rem] shrink-0 h-screen sticky top-0 flex-col overflow-y-auto"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--line)' }}
      >
        {conteudoBarraLateral}
      </aside>

      {/* menu no celular */}
      {menuAberto && (
        <>
          <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'rgba(15,23,41,.45)' }} onClick={() => setMenuAberto(false)} />
          <aside
            className="fixed left-0 top-0 bottom-0 w-[17rem] max-w-[85vw] z-50 lg:hidden flex flex-col overflow-y-auto"
            style={{ background: 'var(--surface)', borderRight: '1px solid var(--line)' }}
          >
            {conteudoBarraLateral}
          </aside>
        </>
      )}

      {/* ===== CONTEÚDO ===== */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* barra superior no celular */}
        <header
          className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center gap-3"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}
        >
          <Botao variante="fantasma" className="btn-icone" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
            <IconeMenu tamanho={17} />
          </Botao>
          <span className="t-secao" style={{ fontSize: '0.9375rem' }}>Radar de Leads</span>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          {/* indicadores */}
          {leads.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <Indicador rotulo="empresas sem site" valor={leads.length} />
              <Indicador rotulo="ainda pendentes" valor={leads.length - contatados} />
              <Indicador rotulo="já contatadas" valor={contatados} cor="var(--ok)" />
              <Indicador rotulo="nota média" valor={mediaAval} />
            </div>
          )}

          {/* gráfico */}
          {logado && leads.length > 0 && (
            <div className="cartao p-4 mb-4 min-w-0">
              <p className="t-apoio font-medium mb-3">Distribuição das notas</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={dadosAvaliacao} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <XAxis dataKey="nome" tick={{ fill: corEixo, fontSize: 10.5 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-2)' }}
                    contentStyle={{
                      background: corFundo, border: `1px solid ${corGrade}`,
                      borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px -2px rgba(0,0,0,.12)',
                    }}
                  />
                  <Bar dataKey="valor" name="empresas" radius={[6, 6, 0, 0]} maxBarSize={56}>
                    {dadosAvaliacao.map((_, i) => <Cell key={i} fill={paletaBarras[i % paletaBarras.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ferramentas */}
          {logado && leads.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <div className="relative flex-1 min-w-[11rem] max-w-[20rem]">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-3)' }}>
                  <IconeBusca tamanho={14} />
                </span>
                <input
                  className="campo"
                  style={{ paddingLeft: '2rem' }}
                  placeholder="Filtrar por nome, endereço ou etiqueta"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  aria-label="Filtrar resultados"
                />
              </div>

              <select
                className="campo"
                style={{ width: 'auto' }}
                value={ordenar}
                onChange={(e) => setOrdenar(e.target.value as Ordenacao)}
                aria-label="Ordenar resultados"
              >
                <option value="recentes">Mais recentes</option>
                <option value="nome">Nome</option>
                <option value="avaliacao">Melhor nota</option>
              </select>

              {[3, 4, 4.5].map((n) => (
                <Botao
                  key={n}
                  variante="secundario"
                  tamanho="p"
                  ativo={notaMin === n}
                  onClick={() => setNotaMin(notaMin === n ? 0 : n)}
                >
                  {String(n).replace('.', ',')} ou mais
                </Botao>
              ))}

              <Botao variante="secundario" tamanho="p" ativo={soNaoContatados} onClick={() => setSoNaoContatados((v) => !v)}>
                Pendentes
              </Botao>

              {comCoordenadas.length > 0 && (
                <Botao variante="secundario" tamanho="p" ativo={verMapa} onClick={() => setVerMapa((v) => !v)}>
                  <IconeMapa tamanho={13} />
                  Mapa
                </Botao>
              )}

              <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                <Botao variante="secundario" tamanho="p" onClick={exportarCSV}>
                  <IconeBaixar tamanho={13} />
                  CSV
                </Botao>
                <Botao variante="perigo-leve" tamanho="p" onClick={() => setConfirmarLimpar(true)}>
                  <IconeLixeira tamanho={13} />
                  Apagar tudo
                </Botao>
              </div>
            </div>
          )}

          {/* mapa */}
          {logado && verMapa && comCoordenadas.length > 0 && (
            <div className="cartao overflow-hidden mb-4 h-[15rem] sm:h-[20rem]">
              <MapaLeads pontos={comCoordenadas} selecionado={selecionado} aoSelecionar={escolherLead} tema={tema} />
            </div>
          )}

          {/* resultados */}
          {carregandoInicial || (carregando && leads.length === 0) ? (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 17rem), 1fr))' }}>
              {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonCartao key={i} />)}
            </div>
          ) : leads.length === 0 ? (
            <BoasVindas />
          ) : (
            <div className="relative">
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 17rem), 1fr))',
                  ...(visitante ? { filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none' } : {}),
                }}
              >
                {visiveis.map((lead, i) => (
                  <CartaoLead
                    key={lead.id}
                    lead={lead}
                    selecionado={selecionado === lead.id}
                    indice={i}
                    aoAbrir={() => escolherLead(lead.id)}
                  />
                ))}
              </div>

              {visiveis.length === 0 && (
                <div className="cartao">
                  <EstadoVazio
                    icone={<IconeBusca tamanho={18} />}
                    titulo="Nenhuma empresa com esses filtros"
                    texto="Baixe a nota mínima ou limpe o texto do filtro."
                    acao={temFiltro && (
                      <Botao variante="secundario" onClick={() => { setBusca(''); setNotaMin(0); setSoNaoContatados(false); }}>
                        Limpar filtros
                      </Botao>
                    )}
                  />
                </div>
              )}

              {visitante && (
                <div className="absolute inset-0 flex items-start justify-center pt-12 px-4">
                  <div className="cartao p-6 text-center max-w-[20rem] w-full" style={{ boxShadow: 'var(--s3)' }}>
                    <p className="t-numero text-[2.5rem]" style={{ color: 'var(--marca-1)' }}>{leads.length}</p>
                    <p className="text-[0.875rem] font-medium mt-1.5">empresas sem site nessa região</p>
                    <p className="t-corpo mt-1 mb-5 leading-relaxed">
                      Crie uma conta para ver nomes, telefones e endereços.
                    </p>
                    <a href="/cadastro" className="btn btn-principal btn-g btn-bloco">Criar conta grátis</a>
                    <a href="/login" className="block t-apoio mt-3" style={{ color: 'var(--ink-2)' }}>Já tenho conta</a>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ===== PAINEL DE DETALHE ===== */}
      {logado && leadAtual && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(15,23,41,.45)' }} onClick={() => setSelecionado(null)} />
          <aside className="painel-lado sm:max-w-[24rem]" aria-label="Detalhes da empresa">
            <div
              className="sticky top-0 z-10 p-4 flex items-start justify-between gap-3"
              style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}
            >
              <div className="min-w-0">
                <h2 className="t-secao">{leadAtual.nome}</h2>
                {leadAtual.categoria && <p className="t-nota mt-0.5">{leadAtual.categoria}</p>}
              </div>
              <Botao variante="fantasma" className="btn-icone shrink-0" onClick={() => setSelecionado(null)} aria-label="Fechar">
                <IconeFechar tamanho={15} />
              </Botao>
            </div>

            <div className="p-4">
              <dl className="space-y-3 mb-4">
                <Dado rotulo="Telefone" valor={leadAtual.telefone} destaque />
                <Dado rotulo="Endereço" valor={leadAtual.endereco} />
                {leadAtual.avaliacao && (
                  <div>
                    <dt className="t-nota mb-1">Avaliação</dt>
                    <dd className="flex items-center gap-2">
                      <Estrelas nota={Number(leadAtual.avaliacao)} />
                      <span className="t-nota">
                        {leadAtual.total_avaliacoes ? `${leadAtual.total_avaliacoes} avaliações` : ''}
                      </span>
                    </dd>
                  </div>
                )}
                {leadAtual.horario_funcionamento && (
                  <div>
                    <dt className="t-nota mb-1">Horário</dt>
                    <dd className="t-apoio leading-relaxed">
                      {leadAtual.horario_funcionamento.split(' | ').map((linha, i) => (
                        <span key={i} className="block">{linha}</span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="flex flex-wrap gap-1.5 mb-4">
                <Botao
                  variante="secundario"
                  tamanho="p"
                  ativo={leadAtual.contatado}
                  onClick={() => alternarContato(leadAtual.id)}
                >
                  {leadAtual.contatado ? <IconeCheck tamanho={13} /> : null}
                  {leadAtual.contatado ? 'Contatado' : 'Marcar contatado'}
                </Botao>
                <a
                  href={`https://wa.me/55${soDigitos(leadAtual.telefone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secundario btn-p"
                >
                  <IconeWhatsapp tamanho={13} />
                  WhatsApp
                </a>
                <Botao
                  variante="secundario"
                  tamanho="p"
                  onClick={() => copiar(leadAtual.telefone, 'tel', 'Telefone copiado')}
                >
                  {copiado === 'tel' ? <IconeCheck tamanho={13} /> : <IconeCopiar tamanho={13} />}
                  Copiar telefone
                </Botao>
                {leadAtual.google_maps_url && (
                  <a href={leadAtual.google_maps_url} target="_blank" rel="noopener noreferrer" className="btn btn-secundario btn-p">
                    <IconeMapa tamanho={13} />
                    Ver no Maps
                  </a>
                )}
                <Botao
                  variante="secundario"
                  tamanho="p"
                  onClick={() => copiar(textoParaPrompt(leadAtual), 'resumo', 'Resumo copiado')}
                >
                  {copiado === 'resumo' ? <IconeCheck tamanho={13} /> : <IconeCopiar tamanho={13} />}
                  Copiar resumo
                </Botao>
              </div>

              {/* bloco de IA */}
              <div
                className="p-3.5 rounded-lg mb-4"
                style={{ background: 'var(--marca-wash)', border: '1px solid var(--marca-borda)' }}
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="t-nota font-semibold" style={{ color: 'var(--marca-2)' }}>Texto gerado por IA</span>
                  {(leadAtual.mensagem_ia || leadAtual.resumo_ia) && (
                    <button
                      onClick={() => gerarComIA(true)}
                      disabled={gerandoIA}
                      className="t-nota font-medium"
                      style={{ color: 'var(--marca-2)' }}
                    >
                      {gerandoIA ? 'Gerando…' : 'Gerar de novo'}
                    </button>
                  )}
                </div>

                {gerandoIA && !leadAtual.mensagem_ia ? (
                  <div className="space-y-2">
                    <Skeleton altura={11} />
                    <Skeleton altura={11} largura="85%" />
                    <Skeleton altura={11} largura="60%" />
                  </div>
                ) : (
                  <>
                    {leadAtual.resumo_ia && (
                      <div className="mb-3">
                        <p className="t-nota font-medium mb-1">Resumo da oportunidade</p>
                        <p className="text-[0.8125rem] leading-relaxed">{leadAtual.resumo_ia}</p>
                      </div>
                    )}
                    {leadAtual.mensagem_ia && (
                      <div className="mb-3">
                        <p className="t-nota font-medium mb-1">Mensagem sugerida</p>
                        <p
                          className="text-[0.8125rem] leading-relaxed p-2.5 rounded-md"
                          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
                        >
                          {leadAtual.mensagem_ia}
                        </p>
                      </div>
                    )}
                    {leadAtual.mensagem_ia ? (
                      <Botao
                        variante="secundario"
                        tamanho="p"
                        bloco
                        onClick={() => copiar(leadAtual.mensagem_ia || '', 'msg', 'Mensagem copiada')}
                      >
                        {copiado === 'msg' ? <IconeCheck tamanho={13} /> : <IconeCopiar tamanho={13} />}
                        Copiar mensagem
                      </Botao>
                    ) : (
                      <Botao variante="principal" bloco carregando={gerandoIA} onClick={() => gerarComIA(false)}>
                        Gerar mensagem e resumo
                      </Botao>
                    )}
                  </>
                )}
              </div>

              <hr className="divisor mb-4" />

              <div className="space-y-3.5">
                <Campo
                  id="tags"
                  rotulo="Etiquetas"
                  dica="Separe por vírgula"
                  placeholder="prioridade, retornar, ja falei"
                  value={rascunhoTags}
                  onChange={(e) => setRascunhoTags(e.target.value)}
                />
                <div>
                  <label htmlFor="nota" className="t-rotulo">Anotações</label>
                  <textarea
                    id="nota"
                    className="campo"
                    rows={4}
                    placeholder="O que combinaram, quando retornar, quem atende"
                    value={rascunhoNota}
                    onChange={(e) => setRascunhoNota(e.target.value)}
                  />
                </div>
                <Botao variante="principal" bloco carregando={salvandoNota} onClick={salvarNota}>
                  Salvar anotação
                </Botao>
              </div>
            </div>
          </aside>
        </>
      )}

      {aviso && <Toast texto={aviso} />}

      {confirmarLimpar && (
        <Modal
          titulo="Apagar todos os leads"
          descricao={`As ${leads.length} empresas salvas serão removidas, junto das anotações e etiquetas. Não dá para desfazer.`}
          aoFechar={() => setConfirmarLimpar(false)}
          acoes={
            <>
              <Botao variante="secundario" onClick={() => setConfirmarLimpar(false)}>Cancelar</Botao>
              <Botao variante="perigo" onClick={limparTudo}>Apagar tudo</Botao>
            </>
          }
        />
      )}
    </div>
  );
}

/* ---------------- peças ---------------- */

function Indicador({ rotulo, valor, cor }: { rotulo: string; valor: number | string; cor?: string }) {
  return (
    <div className="cartao p-4 min-w-0">
      <div className="t-numero text-[1.5rem] sm:text-[1.75rem]" style={{ color: cor }}>{valor}</div>
      <div className="t-nota mt-1 truncate">{rotulo}</div>
    </div>
  );
}

function CartaoLead({
  lead,
  selecionado,
  indice,
  aoAbrir,
}: {
  lead: Lead;
  selecionado: boolean;
  indice: number;
  aoAbrir: () => void;
}) {
  return (
    <button
      onClick={aoAbrir}
      data-sel={selecionado ? '1' : '0'}
      className="cartao cartao-clicavel overflow-hidden surge p-4 pl-5"
      style={{ opacity: lead.contatado ? 0.66 : 1, animationDelay: `${Math.min(indice * 0.025, 0.3)}s` }}
    >
      <span className={`marcador ${lead.contatado ? 'marcador-ok' : ''}`} />

      <span className="flex items-start gap-2.5 mb-2.5">
        <AvatarEmpresa nome={lead.nome} />
        <span className="min-w-0 flex-1">
          <span className="block text-[0.875rem] font-semibold truncate leading-snug">{lead.nome}</span>
          {lead.categoria && <span className="t-nota block truncate mt-0.5">{lead.categoria}</span>}
        </span>
      </span>

      {lead.avaliacao ? (
        <span className="block mb-2"><Estrelas nota={Number(lead.avaliacao)} /></span>
      ) : (
        <span className="t-nota block mb-2">sem avaliação</span>
      )}

      <span className="t-apoio block leading-snug mb-2.5 line-clamp-2">{lead.endereco}</span>

      <span className="block text-[0.875rem] font-semibold" style={{ color: 'var(--marca-1)' }}>
        {lead.telefone}
      </span>

      {((lead.tags ?? []).length > 0 || lead.notas) && (
        <span className="flex gap-1.5 mt-2.5 flex-wrap items-center">
          {(lead.tags ?? []).slice(0, 3).map((t) => <Etiqueta key={t}>{t}</Etiqueta>)}
          {lead.notas && <IconeNota tamanho={13} style={{ color: 'var(--ink-3)' }} />}
        </span>
      )}
    </button>
  );
}

function AvatarEmpresa({ nome }: { nome: string }) {
  const cores = ['#1e40af', '#2563eb', '#3b82f6', '#0369a1', '#475569'];
  let soma = 0;
  for (let i = 0; i < nome.length; i++) soma += nome.charCodeAt(i);
  const inicial = nome.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[0.8125rem] font-semibold"
      style={{ background: cores[soma % cores.length], color: '#fff' }}
      aria-hidden="true"
    >
      {inicial}
    </span>
  );
}

function Estrelas({ nota }: { nota: number }) {
  const cheias = Math.round(nota);
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Nota ${nota} de 5`}>
      <span className="inline-flex gap-px" style={{ color: 'var(--alerta)' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <IconeEstrela key={n} tamanho={12} preenchida={n <= cheias} style={{ opacity: n <= cheias ? 1 : 0.3 }} />
        ))}
      </span>
      <span className="t-nota" style={{ fontWeight: 500 }}>{nota}</span>
    </span>
  );
}

function Dado({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div>
      <dt className="t-nota mb-0.5">{rotulo}</dt>
      <dd
        className={destaque ? 'text-[0.9375rem] font-semibold' : 'text-[0.875rem] leading-snug'}
        style={destaque ? { color: 'var(--marca-1)' } : undefined}
      >
        {valor}
      </dd>
    </div>
  );
}

function BoasVindas() {
  return (
    <div className="cartao overflow-hidden max-w-[42rem] mx-auto mt-2 sm:mt-6">
      <div className="p-7 sm:p-10 text-center">
        <Etiqueta tom="marca">Dados do Google Maps</Etiqueta>
        <h2 className="t-titulo mt-4 mb-3 text-[1.5rem] sm:text-[1.875rem]">
          Encontre quem ainda não tem site
        </h2>
        <p className="t-corpo max-w-[26rem] mx-auto leading-relaxed">
          Escolha um nicho e uma cidade ao lado. A busca traz as empresas daquela região
          que não têm site cadastrado, com telefone, endereço e nota do Google.
        </p>
      </div>
      <hr className="divisor" />
      <div className="grid grid-cols-3 divide-x" style={{ borderColor: 'var(--line)' }}>
        {[
          { titulo: 'Endereço', texto: 'onde a empresa fica' },
          { titulo: 'Telefone', texto: 'contato do Google' },
          { titulo: 'Mensagem', texto: 'rascunho automático' },
        ].map((b) => (
          <div key={b.titulo} className="p-4 text-center" style={{ borderColor: 'var(--line)' }}>
            <p className="text-[0.8125rem] font-semibold">{b.titulo}</p>
            <p className="t-nota mt-0.5 leading-tight">{b.texto}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
