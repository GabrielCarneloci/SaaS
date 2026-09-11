'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Moldura } from '@/components/Moldura';
import {
  Botao, Campo, Aviso, Etiqueta, Modal, Skeleton, CabecalhoPagina,
} from '@/components/ui';
import { MedidorSenha } from '@/components/MedidorSenha';
import { IconeConta, IconeRelogio, IconeLixeira, IconeEscudo } from '@/components/Icones';

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
  login: 'Entrou na conta',
  login_falhou: 'Tentativa de entrada com senha incorreta',
  cadastro: 'Conta criada',
  senha_alterada: 'Senha alterada',
  email_alterado: 'E-mail alterado',
};

function Secao({
  titulo,
  descricao,
  icone,
  acao,
  children,
  perigo,
}: {
  titulo: string;
  descricao?: string;
  icone?: React.ReactNode;
  acao?: React.ReactNode;
  children: React.ReactNode;
  perigo?: boolean;
}) {
  return (
    <section className="cartao mb-4" style={perigo ? { borderColor: 'var(--perigo-borda)' } : undefined}>
      <div className="flex items-start justify-between gap-3 p-5 pb-3.5">
        <div className="flex items-start gap-2.5 min-w-0">
          {icone && (
            <span className="mt-0.5 shrink-0" style={{ color: perigo ? 'var(--perigo)' : 'var(--ink-3)' }}>
              {icone}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="t-secao" style={perigo ? { color: 'var(--perigo)' } : undefined}>{titulo}</h2>
            {descricao && <p className="t-corpo mt-0.5 leading-relaxed">{descricao}</p>}
          </div>
        </div>
        {acao && <div className="shrink-0">{acao}</div>}
      </div>
      <hr className="divisor" />
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function Perfil() {
  const router = useRouter();
  const [carregandoPagina, setCarregandoPagina] = useState(true);
  const [email, setEmail] = useState('');
  const [ehAdmin, setEhAdmin] = useState(false);
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
  const [modalExclusao, setModalExclusao] = useState(false);
  const [pedindoExclusao, setPedindoExclusao] = useState(false);
  const [msgExclusao, setMsgExclusao] = useState('');
  const [erroExclusao, setErroExclusao] = useState('');

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
      setEhAdmin(data.usuario.is_admin);
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

    setCarregandoPagina(false);
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
    setErroExclusao('');
    setPedindoExclusao(true);
    try {
      const res = await fetch('/api/auth/excluir-conta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha: senhaExclusao }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro);
      setMsgExclusao('Enviamos um e-mail de confirmação. Clique no link para excluir a conta.');
      setModalExclusao(false);
      setSenhaExclusao('');
    } catch (e: any) {
      setErroExclusao(e.message || 'Falha ao solicitar exclusão');
    } finally {
      setPedindoExclusao(false);
    }
  }

  function formatarData(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  }

  function nomeDispositivo(ua: string) {
    if (/Mobile|Android|iPhone/i.test(ua)) return 'Celular';
    if (/iPad|Tablet/i.test(ua)) return 'Tablet';
    if (/Mac/i.test(ua)) return 'Mac';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Dispositivo';
  }

  return (
    <Moldura paginaAtiva="conta" ehAdmin={ehAdmin}>
      <CabecalhoPagina titulo="Sua conta" descricao="Dados de acesso, dispositivos conectados e histórico." />

      {!emailVerificado && (
        <div className="mb-4">
          <Aviso tom="info">
            Seu e-mail ainda não foi confirmado.{' '}
            <a href="/verifique-seu-email" className="font-semibold underline">Confirmar agora</a>
          </Aviso>
        </div>
      )}

      {carregandoPagina ? (
        <div className="space-y-4">
          <div className="cartao p-5"><Skeleton altura={18} largura="30%" /><div className="h-4" /><Skeleton altura={120} /></div>
          <div className="cartao p-5"><Skeleton altura={18} largura="25%" /><div className="h-4" /><Skeleton altura={70} /></div>
        </div>
      ) : (
        <>
          <Secao
            titulo="Dados de acesso"
            descricao="Para mudar qualquer coisa aqui, confirme com a senha atual."
            icone={<IconeConta tamanho={17} />}
          >
            <div className="mb-4">
              <span className="t-rotulo">E-mail atual</span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[0.875rem]">{email}</span>
                {emailVerificado
                  ? <Etiqueta tom="ok">confirmado</Etiqueta>
                  : <Etiqueta tom="perigo">não confirmado</Etiqueta>}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3.5 mb-3.5">
              <Campo
                id="novo-email"
                rotulo="Novo e-mail"
                type="email"
                placeholder="deixe vazio para manter"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
              />
              <div>
                <Campo
                  id="nova-senha"
                  rotulo="Nova senha"
                  type="password"
                  autoComplete="new-password"
                  placeholder="deixe vazio para manter"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                />
                <MedidorSenha senha={novaSenha} />
              </div>
            </div>

            <div className="sm:max-w-[50%]">
              <Campo
                id="senha-atual"
                rotulo="Senha atual"
                type="password"
                autoComplete="current-password"
                placeholder="obrigatória para confirmar"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
              />
            </div>

            {erroPerfil && <div className="mt-4"><Aviso tom="erro">{erroPerfil}</Aviso></div>}
            {msgPerfil && <div className="mt-4"><Aviso tom="ok">{msgPerfil}</Aviso></div>}

            <div className="mt-4">
              <Botao variante="principal" carregando={salvando} onClick={salvarPerfil}>
                Salvar alterações
              </Botao>
            </div>
          </Secao>

          <Secao
            titulo="Dispositivos conectados"
            descricao={`${sessoes.length} ${sessoes.length === 1 ? 'sessão ativa' : 'sessões ativas'}.`}
            icone={<IconeEscudo tamanho={17} />}
            acao={sessoes.length > 1 ? (
              <Botao variante="perigo-leve" tamanho="p" onClick={encerrarOutras}>
                Encerrar as outras
              </Botao>
            ) : undefined}
          >
            <div className="space-y-2">
              {sessoes.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
                >
                  <div className="min-w-0">
                    <p className="text-[0.8125rem] font-medium flex items-center gap-1.5 flex-wrap">
                      {nomeDispositivo(s.user_agent)}
                      {s.id === sessaoAtualId && <Etiqueta tom="marca">este dispositivo</Etiqueta>}
                    </p>
                    <p className="t-nota mt-0.5">
                      {s.ip} · visto em {formatarData(s.ultimo_uso)}
                    </p>
                  </div>
                  {s.id !== sessaoAtualId && (
                    <Botao variante="secundario" tamanho="p" onClick={() => revogarSessao(s.id)}>
                      Encerrar
                    </Botao>
                  )}
                </div>
              ))}
              {sessoes.length === 0 && <p className="t-corpo">Nenhuma sessão ativa registrada.</p>}
            </div>
          </Secao>

          <Secao
            titulo="Atividade recente"
            descricao="Últimos acessos e alterações feitas na conta."
            icone={<IconeRelogio tamanho={17} />}
          >
            <div className="max-h-[16rem] overflow-auto -mx-1 px-1">
              {atividades.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 py-2"
                  style={{ borderBottom: i < atividades.length - 1 ? '1px solid var(--line)' : 'none' }}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span
                      className="ponto"
                      style={{ background: a.tipo === 'login_falhou' ? 'var(--perigo)' : 'var(--ok)' }}
                    />
                    <span className="text-[0.8125rem] truncate">{NOMES_ATIVIDADE[a.tipo] ?? a.tipo}</span>
                  </div>
                  <span className="t-nota shrink-0">{formatarData(a.criado_em)}</span>
                </div>
              ))}
              {atividades.length === 0 && <p className="t-corpo">Nada registrado ainda.</p>}
            </div>
          </Secao>

          <Secao
            titulo="Excluir conta"
            descricao="Remove a conta e todos os leads salvos. Enviamos um e-mail antes de apagar qualquer coisa."
            icone={<IconeLixeira tamanho={17} />}
            perigo
          >
            {msgExclusao && <div className="mb-3"><Aviso tom="ok">{msgExclusao}</Aviso></div>}
            <Botao variante="perigo-leve" onClick={() => setModalExclusao(true)}>
              Solicitar exclusão
            </Botao>
          </Secao>
        </>
      )}

      {modalExclusao && (
        <Modal
          titulo="Excluir sua conta"
          descricao="Confirme com sua senha. Em seguida enviamos um e-mail, e a conta só é apagada depois que você clicar no link."
          aoFechar={() => { setModalExclusao(false); setErroExclusao(''); }}
          acoes={
            <>
              <Botao variante="secundario" onClick={() => setModalExclusao(false)}>Cancelar</Botao>
              <Botao
                variante="perigo"
                carregando={pedindoExclusao}
                disabled={!senhaExclusao}
                onClick={pedirExclusao}
              >
                Enviar confirmação
              </Botao>
            </>
          }
        >
          <Campo
            id="senha-exclusao"
            rotulo="Sua senha"
            type="password"
            autoComplete="current-password"
            placeholder="Digite para confirmar"
            value={senhaExclusao}
            onChange={(e) => setSenhaExclusao(e.target.value)}
            erro={erroExclusao || undefined}
          />
        </Modal>
      )}
    </Moldura>
  );
}
