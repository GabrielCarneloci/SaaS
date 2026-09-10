'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Usuario {
  id: number;
  email: string;
  bloqueado: boolean;
  is_admin: boolean;
  criado_em: string;
  total_leads: number;
}

interface LeadAdmin {
  id: number;
  nome: string;
  endereco: string;
  telefone: string;
  avaliacao: number | null;
  nicho: string;
  localidade: string;
  contatado: boolean;
  usuario_email: string;
}

export default function PainelAdmin() {
  const router = useRouter();
  const [aba, setAba] = useState<'usuarios' | 'leads'>('usuarios');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [leads, setLeads] = useState<LeadAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    try {
      const [resUsuarios, resLeads] = await Promise.all([
        fetch('/api/admin/usuarios'),
        fetch('/api/admin/leads'),
      ]);
      if (resUsuarios.status === 403) {
        setErro('Acesso restrito a administradores.');
        return;
      }
      const dadosUsuarios = await resUsuarios.json();
      const dadosLeads = await resLeads.json();
      setUsuarios(dadosUsuarios.usuarios ?? []);
      setLeads(dadosLeads.leads ?? []);
    } catch {
      setErro('Falha ao carregar dados do painel.');
    } finally {
      setCarregando(false);
    }
  }

  async function alternarBloqueio(usuarioId: number) {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuarioId ? { ...u, bloqueado: !u.bloqueado } : u))
    );
    await fetch('/api/admin/bloquear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId }),
    });
  }

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--canvas)' }}>
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: 'var(--danger)' }}>{erro}</p>
          <button onClick={() => router.push('/dashboard')} className="acao-discreta">Voltar ao dashboard</button>
        </div>
      </div>
    );
  }

  const totalUsuarios = usuarios.length;
  const totalBloqueados = usuarios.filter((u) => u.bloqueado).length;
  const totalLeadsGeral = usuarios.reduce((s, u) => s + u.total_leads, 0);

  return (
    <div className="min-h-screen" style={{ background: 'var(--canvas)' }}>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Painel admin</h1>
            <p className="text-xs mono mt-0.5" style={{ color: 'var(--ink-3)' }}>Visão geral do sistema</p>
          </div>
          <a href="/dashboard" className="acao-discreta">← Voltar</a>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Metrica label="Usuários" valor={totalUsuarios} />
          <Metrica label="Bloqueados" valor={totalBloqueados} />
          <Metrica label="Leads no total" valor={totalLeadsGeral} />
        </div>

        {/* Abas */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setAba('usuarios')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: aba === 'usuarios' ? 'var(--accent)' : 'var(--surface)',
              color: aba === 'usuarios' ? '#fff' : 'var(--ink-2)',
              border: '1px solid var(--line)',
            }}
          >
            Usuários
          </button>
          <button
            onClick={() => setAba('leads')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: aba === 'leads' ? 'var(--accent)' : 'var(--surface)',
              color: aba === 'leads' ? '#fff' : 'var(--ink-2)',
              border: '1px solid var(--line)',
            }}
          >
            Todos os leads
          </button>
        </div>

        {carregando ? (
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>Carregando…</p>
        ) : aba === 'usuarios' ? (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
            <div
              className="grid grid-cols-[1fr_100px_100px_90px] gap-4 px-5 py-3 text-[11px] mono uppercase tracking-wider"
              style={{ background: 'var(--surface)', color: 'var(--ink-3)' }}
            >
              <span>E-mail</span>
              <span>Leads</span>
              <span>Status</span>
              <span></span>
            </div>
            {usuarios.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-[1fr_100px_100px_90px] gap-4 px-5 py-3.5 items-center"
                style={{ borderTop: '1px solid var(--line)' }}
              >
                <div className="text-sm truncate flex items-center gap-2" style={{ color: 'var(--ink)' }}>
                  {u.email}
                  {u.is_admin && (
                    <span className="text-[10px] mono px-1.5 py-0.5 rounded" style={{ background: 'var(--accent)', color: '#fff' }}>
                      admin
                    </span>
                  )}
                </div>
                <span className="text-sm mono" style={{ color: 'var(--ink-2)' }}>{u.total_leads}</span>
                <span className="text-xs mono" style={{ color: u.bloqueado ? 'var(--danger)' : 'var(--accent)' }}>
                  {u.bloqueado ? 'Bloqueado' : 'Ativo'}
                </span>
                {!u.is_admin && (
                  <button
                    onClick={() => alternarBloqueio(u.id)}
                    className="text-xs font-medium px-3 py-1.5 rounded-md"
                    style={{
                      border: '1px solid var(--border-bright)',
                      color: u.bloqueado ? 'var(--accent)' : 'var(--danger)',
                    }}
                  >
                    {u.bloqueado ? 'Liberar' : 'Bloquear'}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
            <div
              className="grid grid-cols-[1fr_1fr_140px] gap-4 px-5 py-3 text-[11px] mono uppercase tracking-wider"
              style={{ background: 'var(--surface)', color: 'var(--ink-3)' }}
            >
              <span>Empresa</span>
              <span>Usuário</span>
              <span>Telefone</span>
            </div>
            {leads.map((l) => (
              <div
                key={l.id}
                className="grid grid-cols-[1fr_1fr_140px] gap-4 px-5 py-3.5 items-center"
                style={{ borderTop: '1px solid var(--line)' }}
              >
                <div className="min-w-0">
                  <div className="text-sm truncate" style={{ color: 'var(--ink)' }}>{l.nome}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>{l.endereco}</div>
                </div>
                <span className="text-xs truncate" style={{ color: 'var(--ink-2)' }}>{l.usuario_email}</span>
                <span className="text-sm mono" style={{ color: 'var(--accent)' }}>{l.telefone}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Metrica({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="px-4 py-3 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <div className="text-xl font-bold tabular-nums mono" style={{ color: 'var(--accent)' }}>{valor}</div>
      <div className="text-[10px] mono uppercase tracking-wide mt-0.5" style={{ color: 'var(--ink-3)' }}>{label}</div>
    </div>
  );
}
