'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Usuario {
  id: number;
  email: string;
  bloqueado: boolean;
  is_admin: boolean;
  criado_em: string;
  total_leads: number;
}

interface LeadUsuario {
  id: number;
  nome: string;
  endereco: string;
  telefone: string;
  avaliacao: number | null;
  nicho: string;
  localidade: string;
  contatado: boolean;
  notas: string | null;
  tags: string[] | null;
}

interface PontoSerie { dia: string; total: number; }

export default function PainelAdmin() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [confirmarExcluir, setConfirmarExcluir] = useState<Usuario | null>(null);
  const [avisos, setAvisos] = useState('');

  const [usuarioAberto, setUsuarioAberto] = useState<Usuario | null>(null);
  const [leadsUsuario, setLeadsUsuario] = useState<LeadUsuario[]>([]);
  const [topNichos, setTopNichos] = useState<{ nicho: string; total: number }[]>([]);
  const [topCidades, setTopCidades] = useState<{ localidade: string; total: number }[]>([]);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  const [serieUsuarios, setSerieUsuarios] = useState<PontoSerie[]>([]);
  const [serieLeads, setSerieLeads] = useState<PontoSerie[]>([]);

  useEffect(() => {
    carregar();
    carregarCrescimento();
  }, []);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await fetch('/api/admin/usuarios');
      if (res.status === 403) {
        setErro('Acesso restrito a administradores.');
        return;
      }
      const dados = await res.json();
      setUsuarios(dados.usuarios ?? []);
    } catch {
      setErro('Falha ao carregar dados do painel.');
    } finally {
      setCarregando(false);
    }
  }

  async function carregarCrescimento() {
    try {
      const res = await fetch('/api/admin/crescimento');
      const dados = await res.json();
      setSerieUsuarios(dados.usuarios ?? []);
      setSerieLeads(dados.leads ?? []);
    } catch {}
  }

  async function abrirUsuario(u: Usuario) {
    setUsuarioAberto(u);
    setCarregandoDetalhe(true);
    try {
      const res = await fetch(`/api/admin/leads-usuario?usuarioId=${u.id}`);
      const dados = await res.json();
      setLeadsUsuario(dados.leads ?? []);
      setTopNichos(dados.topNichos ?? []);
      setTopCidades(dados.topCidades ?? []);
    } catch {
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  function mostrarAviso(texto: string) {
    setAvisos(texto);
    setTimeout(() => setAvisos(''), 2200);
  }

  async function alternarBloqueio(usuarioId: number) {
    setUsuarios((prev) => prev.map((u) => (u.id === usuarioId ? { ...u, bloqueado: !u.bloqueado } : u)));
    await fetch('/api/admin/bloquear', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId }),
    });
  }

  async function alternarAdmin(usuarioId: number) {
    setUsuarios((prev) => prev.map((u) => (u.id === usuarioId ? { ...u, is_admin: !u.is_admin } : u)));
    await fetch('/api/admin/tornar-admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId }),
    });
    mostrarAviso('Permissão atualizada');
  }

  async function excluirUsuario() {
    if (!confirmarExcluir) return;
    const id = confirmarExcluir.id;
    setConfirmarExcluir(null);
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
    if (usuarioAberto?.id === id) setUsuarioAberto(null);
    try {
      const res = await fetch('/api/admin/excluir-usuario', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId: id }),
      });
      if (!res.ok) throw new Error();
      mostrarAviso('Usuário excluído');
    } catch {
      mostrarAviso('Não foi possível excluir');
      carregar();
    }
  }

  const usuariosFiltrados = useMemo(() => {
    if (!busca) return usuarios;
    const q = busca.toLowerCase();
    return usuarios.filter((u) => u.email.toLowerCase().includes(q));
  }, [usuarios, busca]);

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--canvas)' }}>
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: 'var(--danger)' }}>{erro}</p>
          <button onClick={() => router.push('/dashboard')} className="acao-discreta">Voltar ao painel</button>
        </div>
      </div>
    );
  }

  const totalUsuarios = usuarios.length;
  const totalBloqueados = usuarios.filter((u) => u.bloqueado).length;
  const totalLeadsGeral = usuarios.reduce((s, u) => s + u.total_leads, 0);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--canvas)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="min-w-0">
            <h1 className="destaque text-[19px]" style={{ color: 'var(--ink)' }}>Painel admin</h1>
            <p className="text-[12.5px]" style={{ color: 'var(--ink-3)' }}>Visão geral do sistema</p>
          </div>
          <a href="/dashboard" className="acao-discreta shrink-0">← Voltar</a>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-6">
          <Metrica label="Usuários" valor={totalUsuarios} cor="var(--violeta)" />
          <Metrica label="Bloqueados" valor={totalBloqueados} cor="var(--coral)" />
          <Metrica label="Leads no total" valor={totalLeadsGeral} cor="var(--turquesa)" />
        </div>

        {/* Crescimento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="cartao p-4 min-w-0">
            <p className="text-[13px] font-medium mb-3" style={{ color: 'var(--ink-2)' }}>Novos usuários, 30 dias</p>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={serieUsuarios}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="dia" tick={{ fill: 'var(--ink-3)', fontSize: 9 }} axisLine={false} tickLine={false}
                  tickFormatter={(d) => d.slice(8)} interval={4} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 10, fontSize: 12 }} />
                <Line type="monotone" dataKey="total" stroke="var(--violeta)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="cartao p-4 min-w-0">
            <p className="text-[13px] font-medium mb-3" style={{ color: 'var(--ink-2)' }}>Novos leads, 30 dias</p>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={serieLeads}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="dia" tick={{ fill: 'var(--ink-3)', fontSize: 9 }} axisLine={false} tickLine={false}
                  tickFormatter={(d) => d.slice(8)} interval={4} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 10, fontSize: 12 }} />
                <Line type="monotone" dataKey="total" stroke="var(--turquesa)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <input
          className="campo mb-4"
          style={{ maxWidth: 320 }}
          placeholder="Buscar por e-mail"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        {carregando ? (
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>Carregando…</p>
        ) : (
          <div className="space-y-2.5">
            {usuariosFiltrados.map((u) => (
              <div key={u.id} className="cartao p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <button onClick={() => abrirUsuario(u)} className="min-w-0 flex-1 text-left">
                    <div className="text-[13.5px] font-medium truncate flex items-center gap-2" style={{ color: 'var(--ink)' }}>
                      {u.email}
                      {u.is_admin && <span className="etiqueta shrink-0">admin</span>}
                    </div>
                    <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                      {u.total_leads} {u.total_leads === 1 ? 'lead' : 'leads'} ·{' '}
                      <span style={{ color: u.bloqueado ? 'var(--danger)' : 'var(--turquesa)' }}>
                        {u.bloqueado ? 'Bloqueado' : 'Ativo'}
                      </span>
                    </div>
                  </button>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => alternarAdmin(u.id)} className="acao-discreta" style={{ fontSize: 12 }}>
                      {u.is_admin ? 'Remover admin' : 'Tornar admin'}
                    </button>
                    {!u.is_admin && (
                      <>
                        <button
                          onClick={() => alternarBloqueio(u.id)}
                          className="acao-discreta"
                          style={{ fontSize: 12, color: u.bloqueado ? 'var(--turquesa)' : 'var(--danger)' }}
                        >
                          {u.bloqueado ? 'Liberar' : 'Bloquear'}
                        </button>
                        <button
                          onClick={() => setConfirmarExcluir(u)}
                          className="acao-discreta"
                          style={{ fontSize: 12, color: 'var(--danger)' }}
                        >
                          Excluir
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {usuariosFiltrados.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: 'var(--ink-2)' }}>Nenhum usuário encontrado.</p>
            )}
          </div>
        )}
      </div>

      {/* Painel de detalhe do usuário */}
      {usuarioAberto && (
        <>
          <div className="fixed inset-0 z-30" style={{ background: 'rgba(13,10,26,.5)' }} onClick={() => setUsuarioAberto(null)} />
          <aside
            className="fixed right-0 top-0 bottom-0 w-full max-w-[420px] z-40 overflow-auto"
            style={{ background: 'var(--surface)', borderLeft: '1.5px solid var(--line)' }}
          >
            <div className="faixa" style={{ borderRadius: 0 }} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="destaque text-[18px] leading-tight break-all" style={{ color: 'var(--ink)' }}>
                  {usuarioAberto.email}
                </h2>
                <button onClick={() => setUsuarioAberto(null)} className="acao-discreta shrink-0" style={{ padding: '0.3rem 0.6rem' }}>
                  Fechar
                </button>
              </div>

              {carregandoDetalhe ? (
                <p className="text-sm" style={{ color: 'var(--ink-2)' }}>Carregando…</p>
              ) : (
                <>
                  {(topNichos.length > 0 || topCidades.length > 0) && (
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div>
                        <p className="text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink-3)' }}>Nichos mais buscados</p>
                        <div className="space-y-1">
                          {topNichos.map((n) => (
                            <div key={n.nicho} className="text-[12.5px] flex justify-between" style={{ color: 'var(--ink-2)' }}>
                              <span className="truncate">{n.nicho}</span>
                              <span className="font-semibold shrink-0 ml-2">{n.total}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink-3)' }}>Cidades mais buscadas</p>
                        <div className="space-y-1">
                          {topCidades.map((c) => (
                            <div key={c.localidade} className="text-[12.5px] flex justify-between" style={{ color: 'var(--ink-2)' }}>
                              <span className="truncate">{c.localidade}</span>
                              <span className="font-semibold shrink-0 ml-2">{c.total}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-[12px] font-medium mb-2" style={{ color: 'var(--ink-3)' }}>
                    {leadsUsuario.length} leads salvos
                  </p>
                  <div className="space-y-2">
                    {leadsUsuario.map((l) => (
                      <div key={l.id} className="cartao p-3">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <span className="text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>{l.nome}</span>
                          <span className="text-[12px] font-semibold shrink-0" style={{ color: 'var(--violeta)' }}>{l.telefone}</span>
                        </div>
                        <p className="text-[11.5px] truncate mb-1" style={{ color: 'var(--ink-3)' }}>{l.endereco}</p>
                        {(l.tags ?? []).length > 0 && (
                          <div className="flex gap-1 flex-wrap mb-1">
                            {(l.tags ?? []).map((t) => <span key={t} className="etiqueta">{t}</span>)}
                          </div>
                        )}
                        {l.notas && (
                          <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>{l.notas}</p>
                        )}
                      </div>
                    ))}
                    {leadsUsuario.length === 0 && (
                      <p className="text-[13px]" style={{ color: 'var(--ink-2)' }}>Este usuário ainda não tem leads.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>
        </>
      )}

      {/* Confirmar exclusão */}
      {confirmarExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(13,10,26,.55)' }} onClick={() => setConfirmarExcluir(null)}>
          <div className="cartao w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="destaque text-[19px] mb-2" style={{ color: 'var(--ink)' }}>Excluir usuário</h2>
            <p className="text-[13.5px] mb-6 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              Isso remove a conta de <strong>{confirmarExcluir.email}</strong> e todos os {confirmarExcluir.total_leads} leads dele.
              A ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmarExcluir(null)} className="acao-discreta">Cancelar</button>
              <button onClick={excluirUsuario} className="acao-discreta" style={{ background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }}>
                Excluir usuário
              </button>
            </div>
          </div>
        </div>
      )}

      {avisos && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl text-[13px] font-medium z-50"
          style={{ background: 'var(--violeta)', color: '#fff', boxShadow: 'var(--sombra-cor)' }} role="status">
          {avisos}
        </div>
      )}
    </div>
  );
}

function Metrica({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div className="cartao p-3 sm:p-4 min-w-0">
      <div className="destaque text-[22px] sm:text-[26px] leading-none" style={{ color: cor }}>{valor}</div>
      <div className="text-[11px] sm:text-[12px] mt-1 truncate" style={{ color: 'var(--ink-3)' }}>{label}</div>
    </div>
  );
}
