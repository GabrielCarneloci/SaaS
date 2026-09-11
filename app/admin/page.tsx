'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Moldura } from '@/components/Moldura';
import {
  Botao, Campo, Etiqueta, Modal, Skeleton, SkeletonLinha, EstadoVazio, Toast, CabecalhoPagina,
} from '@/components/ui';
import { IconeBusca, IconeConta, IconeFechar } from '@/components/Icones';
import { useTema } from '@/components/useTema';

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

function Indicador({ rotulo, valor, carregando }: { rotulo: string; valor: number; carregando?: boolean }) {
  return (
    <div className="cartao p-4 min-w-0">
      {carregando ? (
        <>
          <Skeleton altura={26} largura="50%" />
          <div className="h-2" />
          <Skeleton altura={11} largura="70%" />
        </>
      ) : (
        <>
          <div className="t-numero text-[1.5rem] sm:text-[1.75rem]">{valor}</div>
          <div className="t-nota mt-1 truncate">{rotulo}</div>
        </>
      )}
    </div>
  );
}

function Grafico({ titulo, dados, cor }: { titulo: string; dados: PontoSerie[]; cor: string }) {
  const { tema } = useTema();
  const eixo = tema === 'escuro' ? '#67748a' : '#8592a6';
  const grade = tema === 'escuro' ? '#212c3a' : '#e4e9f0';
  const fundo = tema === 'escuro' ? '#131a25' : '#ffffff';

  return (
    <div className="cartao p-4 min-w-0">
      <p className="t-apoio font-medium mb-3">{titulo}</p>
      {dados.length === 0 ? (
        <div className="h-[7.5rem] flex items-center justify-center">
          <p className="t-nota">Sem registros nos últimos 30 dias</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={dados} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={grade} vertical={false} />
            <XAxis
              dataKey="dia"
              tick={{ fill: eixo, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(d: string) => d.slice(8)}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: fundo,
                border: `1px solid ${grade}`,
                borderRadius: 8,
                fontSize: 12,
                boxShadow: '0 4px 12px -2px rgba(0,0,0,.12)',
              }}
              labelFormatter={(d) => `Dia ${String(d).slice(8)}`}
            />
            <Line type="monotone" dataKey="total" name="total" stroke={cor} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function PainelAdmin() {
  const router = useRouter();
  const { tema } = useTema();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [confirmarExcluir, setConfirmarExcluir] = useState<Usuario | null>(null);
  const [aviso, setAviso] = useState('');

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
        setErro('Esta área é restrita a administradores.');
        return;
      }
      const dados = await res.json();
      setUsuarios(dados.usuarios ?? []);
    } catch {
      setErro('Não foi possível carregar os dados do painel.');
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
    setAviso(texto);
    setTimeout(() => setAviso(''), 2200);
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
      <Moldura paginaAtiva="admin" ehAdmin>
        <EstadoVazio
          icone={<IconeEscudoSimples />}
          titulo="Acesso restrito"
          texto={erro}
          acao={<Botao variante="secundario" onClick={() => router.push('/dashboard')}>Voltar ao painel</Botao>}
        />
      </Moldura>
    );
  }

  const totalUsuarios = usuarios.length;
  const totalBloqueados = usuarios.filter((u) => u.bloqueado).length;
  const totalLeadsGeral = usuarios.reduce((s, u) => s + u.total_leads, 0);
  const corGrafico = tema === 'escuro' ? '#5b9bf8' : '#2563eb';
  const corGraficoLeads = tema === 'escuro' ? '#34d399' : '#0d8f63';

  return (
    <Moldura paginaAtiva="admin" ehAdmin larguraMaxima="62rem">
      <CabecalhoPagina titulo="Administração" descricao="Usuários cadastrados, atividade e crescimento do sistema." />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Indicador rotulo="usuários" valor={totalUsuarios} carregando={carregando} />
        <Indicador rotulo="bloqueados" valor={totalBloqueados} carregando={carregando} />
        <Indicador rotulo="leads no total" valor={totalLeadsGeral} carregando={carregando} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <Grafico titulo="Novos usuários, últimos 30 dias" dados={serieUsuarios} cor={corGrafico} />
        <Grafico titulo="Novos leads, últimos 30 dias" dados={serieLeads} cor={corGraficoLeads} />
      </div>

      <div className="cartao overflow-hidden">
        <div className="p-4 flex items-center gap-3 flex-wrap">
          <h2 className="t-secao mr-auto">Usuários</h2>
          <div className="relative w-full sm:w-[16rem]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-3)' }}>
              <IconeBusca tamanho={14} />
            </span>
            <input
              className="campo"
              style={{ paddingLeft: '2rem' }}
              placeholder="Buscar por e-mail"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar usuário por e-mail"
            />
          </div>
        </div>
        <hr className="divisor" />

        {carregando ? (
          <div className="p-4">
            {[0, 1, 2].map((i) => <SkeletonLinha key={i} />)}
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <EstadoVazio
            icone={<IconeConta tamanho={18} />}
            titulo={busca ? 'Nenhum usuário com esse e-mail' : 'Nenhum usuário cadastrado'}
            texto={busca ? 'Tente outro trecho do endereço.' : undefined}
          />
        ) : (
          <>
            {/* tabela no desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>E-mail</th>
                    <th style={{ width: '5rem' }}>Leads</th>
                    <th style={{ width: '7rem' }}>Situação</th>
                    <th style={{ width: '1%' }} />
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <button
                          onClick={() => abrirUsuario(u)}
                          className="flex items-center gap-2 text-left hover:underline"
                          style={{ color: 'var(--ink)' }}
                        >
                          <span className="truncate max-w-[18rem]">{u.email}</span>
                          {u.is_admin && <Etiqueta tom="marca">admin</Etiqueta>}
                        </button>
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{u.total_leads}</td>
                      <td>
                        {u.bloqueado
                          ? <Etiqueta tom="perigo">bloqueado</Etiqueta>
                          : <Etiqueta tom="ok">ativo</Etiqueta>}
                      </td>
                      <td>
                        <div className="flex gap-1.5 justify-end">
                          <Botao variante="fantasma" tamanho="p" onClick={() => alternarAdmin(u.id)}>
                            {u.is_admin ? 'Remover admin' : 'Tornar admin'}
                          </Botao>
                          {!u.is_admin && (
                            <>
                              <Botao variante="secundario" tamanho="p" onClick={() => alternarBloqueio(u.id)}>
                                {u.bloqueado ? 'Liberar' : 'Bloquear'}
                              </Botao>
                              <Botao variante="perigo-leve" tamanho="p" onClick={() => setConfirmarExcluir(u)}>
                                Excluir
                              </Botao>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* cards no celular */}
            <div className="md:hidden p-3 space-y-2.5">
              {usuariosFiltrados.map((u) => (
                <div key={u.id} className="p-3 rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                  <button onClick={() => abrirUsuario(u)} className="w-full text-left mb-2.5">
                    <p className="text-[0.8125rem] font-medium truncate flex items-center gap-1.5">
                      {u.email}
                      {u.is_admin && <Etiqueta tom="marca">admin</Etiqueta>}
                    </p>
                    <p className="t-nota mt-1 flex items-center gap-2">
                      <span>{u.total_leads} {u.total_leads === 1 ? 'lead' : 'leads'}</span>
                      {u.bloqueado
                        ? <Etiqueta tom="perigo">bloqueado</Etiqueta>
                        : <Etiqueta tom="ok">ativo</Etiqueta>}
                    </p>
                  </button>
                  <div className="flex gap-1.5 flex-wrap">
                    <Botao variante="fantasma" tamanho="p" onClick={() => alternarAdmin(u.id)}>
                      {u.is_admin ? 'Remover admin' : 'Tornar admin'}
                    </Botao>
                    {!u.is_admin && (
                      <>
                        <Botao variante="secundario" tamanho="p" onClick={() => alternarBloqueio(u.id)}>
                          {u.bloqueado ? 'Liberar' : 'Bloquear'}
                        </Botao>
                        <Botao variante="perigo-leve" tamanho="p" onClick={() => setConfirmarExcluir(u)}>
                          Excluir
                        </Botao>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* painel lateral com o detalhe do usuário */}
      {usuarioAberto && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(15,23,41,.45)' }} onClick={() => setUsuarioAberto(null)} />
          <aside className="painel-lado sm:max-w-[26rem]" aria-label="Detalhes do usuário">
            <div className="sticky top-0 z-10 p-4 flex items-start justify-between gap-3"
              style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
              <div className="min-w-0">
                <h2 className="t-secao break-all">{usuarioAberto.email}</h2>
                <p className="t-nota mt-0.5">{usuarioAberto.total_leads} leads salvos</p>
              </div>
              <Botao variante="fantasma" className="btn-icone shrink-0" onClick={() => setUsuarioAberto(null)} aria-label="Fechar">
                <IconeFechar tamanho={15} />
              </Botao>
            </div>

            <div className="p-4">
              {carregandoDetalhe ? (
                <div className="space-y-3">
                  <Skeleton altura={60} />
                  <Skeleton altura={80} />
                </div>
              ) : (
                <>
                  {(topNichos.length > 0 || topCidades.length > 0) && (
                    <div className="grid grid-cols-2 gap-4 mb-5">
                      <div>
                        <p className="t-nota font-medium mb-2">Nichos mais buscados</p>
                        <div className="space-y-1.5">
                          {topNichos.map((n) => (
                            <div key={n.nicho} className="flex justify-between gap-2 text-[0.8125rem]">
                              <span className="truncate" style={{ color: 'var(--ink-2)' }}>{n.nicho}</span>
                              <span className="shrink-0 font-medium">{n.total}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="t-nota font-medium mb-2">Cidades mais buscadas</p>
                        <div className="space-y-1.5">
                          {topCidades.map((c) => (
                            <div key={c.localidade} className="flex justify-between gap-2 text-[0.8125rem]">
                              <span className="truncate" style={{ color: 'var(--ink-2)' }}>{c.localidade}</span>
                              <span className="shrink-0 font-medium">{c.total}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="t-nota font-medium mb-2">Leads salvos</p>
                  <div className="space-y-2">
                    {leadsUsuario.map((l) => (
                      <div key={l.id} className="p-3 rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <span className="text-[0.8125rem] font-medium truncate">{l.nome}</span>
                          <span className="text-[0.75rem] shrink-0" style={{ color: 'var(--marca-1)' }}>{l.telefone}</span>
                        </div>
                        <p className="t-nota truncate">{l.endereco}</p>
                        {(l.tags ?? []).length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-1.5">
                            {(l.tags ?? []).map((t) => <Etiqueta key={t}>{t}</Etiqueta>)}
                          </div>
                        )}
                        {l.notas && <p className="t-nota mt-1.5 leading-relaxed">{l.notas}</p>}
                      </div>
                    ))}
                    {leadsUsuario.length === 0 && <p className="t-corpo">Este usuário ainda não salvou leads.</p>}
                  </div>
                </>
              )}
            </div>
          </aside>
        </>
      )}

      {confirmarExcluir && (
        <Modal
          titulo="Excluir usuário"
          descricao={`A conta de ${confirmarExcluir.email} e os ${confirmarExcluir.total_leads} leads dela serão apagados. Não dá para desfazer.`}
          aoFechar={() => setConfirmarExcluir(null)}
          acoes={
            <>
              <Botao variante="secundario" onClick={() => setConfirmarExcluir(null)}>Cancelar</Botao>
              <Botao variante="perigo" onClick={excluirUsuario}>Excluir usuário</Botao>
            </>
          }
        />
      )}

      {aviso && <Toast texto={aviso} />}
    </Moldura>
  );
}

function IconeEscudoSimples() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v5.5c0 4.2-2.9 7.6-7 9.5-4.1-1.9-7-5.3-7-9.5V6z" />
    </svg>
  );
}
