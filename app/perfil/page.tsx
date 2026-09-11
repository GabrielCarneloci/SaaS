'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Sessao {
  id: number;
  ip: string;
  user_agent: string;
  criado_em: string;
  ultimo_uso: string;
}

interface Atividade {
  tipo: string;
  detalhe: string | null;
  ip: string;
  criado_em: string;
}

const NOMES_ATIVIDADE: Record<string, string> = {
  login: 'Login realizado',
  login_falhou: 'Tentativa de login com senha incorreta',
  cadastro: 'Conta criada',
  senha_alterada: 'Senha alterada',
  email_alterado: 'E-mail alterado',
};

function forcaSenha(senha: string): { nivel: number; rotulo: string; cor: string } {
  if (!senha) return { nivel: 0, rotulo: '', cor: 'var(--line-2)' };
  let pontos = 0;
  if (senha.length >= 8) pontos++;
  if (senha.length >= 12) pontos++;
  if (/[A-Z]/.test(senha) && /[a-z]/.test(senha)) pontos++;
  if (/[0-9]/.test(senha)) pontos++;
  if (/[^A-Za-z0-9]/.test(senha)) pontos++;

  if (pontos <= 1) return { nivel: 1, rotulo: 'Fraca', cor: 'var(--perigo)' };
  if (pontos <= 3) return { nivel: 2, rotulo: 'Média', cor: 'var(--alerta)' };
  return { nivel: 3, rotulo: 'Forte', cor: 'var(--ok)' };
}

export default function Perfil() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailVerificado, setEmailVerificado] = useState(true);
  const [novoEmail, setNovoEmail] = useState('');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [msgPerfil, setMsgPerfil] = useState('');
  const [erroPerfil, setErroPerfil] = useState('');

  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [sessaoAtualId, setSessaoAtualId] = useState<number | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);

  const [senhaExclusao, setSenhaExclusao] = useState('');
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [pedindoExclusao, setPedindoExclusao] = useState(false);
  const [msgExclusao, setMsgExclusao] = useState('');

  const forca = forcaSenha(novaSenha);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      const res = await fetch('/api/auth/eu');
      const data = await res.json();
      if (!data.usuario) return router.push('/login');
      setEmail(data.usuario.email);
      setEmailVerificado(data.usuario.email_verificado);
    } catch {}

    try {
      const res = await fetch('/api/auth/sessoes');
      const data = await res.json();
      setSessoes(data.sessoes ?? []);
      setSessaoAtualId(data.sessaoAtualId ?? null);
    } catch {}

    try {
      const res = await fetch('/api/auth/atividades');
      const data = await res.json();
      setAtividades(data.atividades ?? []);
    } catch {}
  }

  async function salvarPerfil() {
    setErroPerfil('');
    setMsgPerfil('');
    if (!senhaAtual) {
      setErroPerfil('Informe sua senha atual para confirmar as alterações');
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch('/api/auth/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senhaAtual,
          novaSenha: novaSenha || undefined,
          novoEmail: novoEmail || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro);
      setMsgPerfil((data.mensagens ?? []).join(' · ') || 'Nenhuma alteração enviada');
      setSenhaAtual('');
      setNovaSenha('');
      setNovoEmail('');
      carregar();
    } catch (e: any) {
      setErroPerfil(e.message || 'Falha ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function revogarSessao(id: number) {
    setSessoes((prev) => prev.filter((s) => s.id !== id));
    await fetch('/api/auth/sessoes/revogar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessaoId: id }),
    });
  }

  async function encerrarOutras() {
    await fetch('/api/auth/sessoes/encerrar-outras', { method: 'POST' });
    carregar();
  }

  async function pedirExclusao() {
    setMsgExclusao('');
    setPedindoExclusao(true);
    try {
      const res = await fetch('/api/auth/excluir-conta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha: senhaExclusao }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro);
      setMsgExclusao('Enviamos um e-mail de confirmação. Clique no link para excluir sua conta definitivamente.');
      setConfirmandoExclusao(false);
    } catch (e: any) {
      setMsgExclusao(e.message || 'Falha ao solicitar exclusão');
    } finally {
      setPedindoExclusao(false);
    }
  }

  function formatarData(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function nomeDispositivo(ua: string) {
    if (/Mobile|Android|iPhone/i.test(ua)) return 'Celular';
    if (/Mac/i.test(ua)) return 'Mac';
    if (/Windows/i.test(ua)) return 'Windows';
    return 'Dispositivo';
  }

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--canvas)' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6 gap-3">
          <h1 className="destaque text-[20px]" style={{ color: 'var(--ink)' }}>Sua conta</h1>
          <a href="/dashboard" className="acao-discreta">← Voltar</a>
        </div>

        {!emailVerificado && (
          <div className="cartao p-4 mb-5" style={{ background: 'var(--marca-wash)', borderColor: 'var(--marca-borda)' }}>
            <p className="text-[13px]" style={{ color: 'var(--ink)' }}>
              Seu e-mail ainda não foi confirmado.{' '}
              <a href="/verifique-seu-email" className="font-semibold" style={{ color: 'var(--marca-1)' }}>Confirmar agora</a>
            </p>
          </div>
        )}

        {/* Dados da conta */}
        <div className="cartao p-5 mb-5">
          <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--ink)' }}>Dados da conta</h2>

          <label className="block text-[12.5px] mb-1.5" style={{ color: 'var(--ink-2)' }}>E-mail atual</label>
          <p className="text-[13.5px] mb-4" style={{ color: 'var(--ink)' }}>{email}</p>

          <label className="block text-[12.5px] mb-1.5" style={{ color: 'var(--ink-2)' }}>Novo e-mail (opcional)</label>
          <input className="campo mb-4" placeholder="deixe em branco para não alterar" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} />

          <label className="block text-[12.5px] mb-1.5" style={{ color: 'var(--ink-2)' }}>Nova senha (opcional)</label>
          <input className="campo mb-1.5" type="password" placeholder="deixe em branco para não alterar" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
          {novaSenha && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(forca.nivel / 3) * 100}%`, background: forca.cor }} />
              </div>
              <span className="text-[11.5px] font-medium shrink-0" style={{ color: forca.cor }}>{forca.rotulo}</span>
            </div>
          )}
          {!novaSenha && <div className="mb-4" />}

          <label className="block text-[12.5px] mb-1.5" style={{ color: 'var(--ink-2)' }}>Senha atual, para confirmar</label>
          <input className="campo mb-4" type="password" placeholder="obrigatório" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />

          {erroPerfil && <p className="text-[12.5px] mb-3" style={{ color: 'var(--perigo)' }}>{erroPerfil}</p>}
          {msgPerfil && <p className="text-[12.5px] mb-3" style={{ color: 'var(--ok)' }}>{msgPerfil}</p>}

          <button onClick={salvarPerfil} disabled={salvando} className="acao">
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>

        {/* Sessões ativas */}
        <div className="cartao p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>Sessões ativas</h2>
            {sessoes.length > 1 && (
              <button onClick={encerrarOutras} className="text-[12.5px] font-medium" style={{ color: 'var(--perigo)' }}>
                Sair de todos os outros
              </button>
            )}
          </div>
          <div className="space-y-2">
            {sessoes.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium flex items-center gap-1.5" style={{ color: 'var(--ink)' }}>
                    {nomeDispositivo(s.user_agent)}
                    {s.id === sessaoAtualId && <span className="etiqueta">este dispositivo</span>}
                  </p>
                  <p className="text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                    {s.ip} · último acesso em {formatarData(s.ultimo_uso)}
                  </p>
                </div>
                {s.id !== sessaoAtualId && (
                  <button onClick={() => revogarSessao(s.id)} className="acao-discreta shrink-0" style={{ fontSize: 12 }}>
                    Encerrar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Atividades */}
        <div className="cartao p-5 mb-5">
          <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--ink)' }}>Atividades recentes</h2>
          <div className="space-y-2 max-h-[260px] overflow-auto">
            {atividades.map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-[12.5px]">
                <span style={{ color: 'var(--ink)' }}>{NOMES_ATIVIDADE[a.tipo] ?? a.tipo}</span>
                <span className="shrink-0" style={{ color: 'var(--ink-3)' }}>{formatarData(a.criado_em)}</span>
              </div>
            ))}
            {atividades.length === 0 && <p className="text-[13px]" style={{ color: 'var(--ink-2)' }}>Nenhuma atividade ainda.</p>}
          </div>
        </div>

        {/* Excluir conta */}
        <div className="cartao p-5" style={{ borderColor: 'var(--perigo-wash)' }}>
          <h2 className="text-[14px] font-semibold mb-2" style={{ color: 'var(--perigo)' }}>Excluir conta</h2>
          <p className="text-[12.5px] mb-4 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            Remove sua conta e todos os leads salvos, para sempre. Você receberá um e-mail
            de confirmação antes de a exclusão ser feita de verdade.
          </p>

          {msgExclusao && (
            <p className="text-[12.5px] mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
              {msgExclusao}
            </p>
          )}

          {!confirmandoExclusao ? (
            <button onClick={() => setConfirmandoExclusao(true)} className="acao-discreta" style={{ color: 'var(--perigo)' }}>
              Solicitar exclusão da conta
            </button>
          ) : (
            <div>
              <input
                className="campo mb-3"
                type="password"
                placeholder="Digite sua senha para confirmar"
                value={senhaExclusao}
                onChange={(e) => setSenhaExclusao(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={() => setConfirmandoExclusao(false)} className="acao-discreta">Cancelar</button>
                <button
                  onClick={pedirExclusao}
                  disabled={pedindoExclusao || !senhaExclusao}
                  className="acao-discreta"
                  style={{ background: 'var(--perigo)', color: '#fff', borderColor: 'var(--perigo)' }}
                >
                  {pedindoExclusao ? 'Enviando…' : 'Confirmar e enviar e-mail'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
