import { useCallback, useEffect, useRef, useState } from 'react';
import { ATRIBUTOS, RACAS, fichaNova } from '../modelos/Ficha.js';
import { atualizarFicha, criarFicha, excluirFicha, listarFichas, obterFicha, pedirPersistencia } from '../dados/Banco.js';
import { CompartilharFicha, ImportarFicha } from '../compartilhamento/Compartilhamentoui.jsx';
import { PaginaProficiencias } from './Proficiencias.jsx';
import './fichas.css';

const nomeDe = (f) => f.nome.trim() || '(sem nome)';
const mostrar = (v) => v ?? '--';
const porcento = ({ atual, total }) => (total > 0 ? Math.max(0, Math.min(100, Math.round((atual / total) * 100))) : 0);
const paraNumero = (txt) => (txt === '' ? null : Math.trunc(Number(txt)));

const TEXTO_SALVO = {
  salvo: 'Salvo neste dispositivo.',
  salvando: 'Salvando...',
  erro: 'Não foi possível salvar. As últimas alterações podem não estar gravadas; a próxima alteração tenta de novo.',
};

function useFichas() {
  const [fichas, setFichas] = useState(null);
  const [erro, setErro] = useState(null);
  const recarregar = useCallback(async () => {
    try {
      setFichas(await listarFichas());
      setErro(null);
    } catch (e) {
      setErro(`Não foi possível ler as fichas deste aparelho (${e.message}).`);
    }
  }, []);
  useEffect(() => { recarregar(); }, [recarregar]);
  return { fichas, erro, recarregar };
}

function Cartao({ f, aoExcluir }) {
  return (
    <div className="painel cartao-personagem">
      <strong>{nomeDe(f)}</strong>
      <span className="suave">{f.raca}</span>
      <span className="suave">
        Vida {mostrar(f.vida.atual)}/{mostrar(f.vida.total)}, Essencialidade {mostrar(f.essencialidade.atual)}/{mostrar(f.essencialidade.total)}, Fluxo {mostrar(f.fluxo)}
      </span>
      <div className="acoes">
        <a className="btn" href={`#/personagens/${f.id}`}>Abrir ficha</a>
        <CompartilharFicha ficha={f} rotulo="Compartilhar" />
        {aoExcluir && <button type="button" className="btn perigo" onClick={() => aoExcluir(f)}>Excluir</button>}
      </div>
    </div>
  );
}

export function PersonagensRecentes() {
  const { fichas, erro } = useFichas();
  if (erro) return <p className="vazio" role="alert">{erro}</p>;
  if (!fichas) return <p className="suave">Carregando...</p>;
  if (!fichas.length) return <p className="vazio">Nenhum personagem criado ainda.</p>;
  return <div className="lista">{fichas.slice(0, 3).map((f) => <Cartao key={f.id} f={f} />)}</div>;
}

export function Personagens() {
  const { fichas, erro, recarregar } = useFichas();
  const [falha, setFalha] = useState(null);

  async function criar() {
    try {
      const f = fichaNova();
      await criarFicha(f);
      pedirPersistencia();
      window.location.hash = `#/personagens/${f.id}`;
    } catch (e) {
      setFalha(`Não foi possível criar a ficha (${e.message}).`);
    }
  }

  async function excluir(f) {
    if (!window.confirm(`Excluir "${nomeDe(f)}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await excluirFicha(f.id);
      setFalha(null);
      await recarregar();
    } catch (e) {
      setFalha(`Não foi possível excluir a ficha (${e.message}).`);
    }
  }

  return (
    <>
      <h1>Personagens</h1>
      <div className="acoes">
        <button type="button" className="btn" onClick={criar}>Criar personagem</button>
        <ImportarFicha
          criarFicha={async (novaFicha) => {
            await criarFicha(novaFicha);
            pedirPersistencia();
            return novaFicha;
          }}
          nomesExistentes={fichas ? fichas.map((f) => f.nome.trim()) : []}
          fichasExistentes={fichas ?? []}
          aoImportar={() => recarregar()}
        />
      </div>
      {(erro || falha) && <p className="vazio" role="alert">{erro || falha}</p>}
      <h2>Suas fichas</h2>
      {!fichas && !erro && <p className="suave">Carregando...</p>}
      {fichas && !fichas.length && <p className="vazio">Você ainda não criou fichas.</p>}
      {fichas && fichas.length > 0 && <div className="lista">{fichas.map((f) => <Cartao key={f.id} f={f} aoExcluir={excluir} />)}</div>}
    </>
  );
}

const Texto = ({ rotulo, valor, aoMudar, className = 'campo' }) => (
  <label className={className}>
    <span className="rotulo">{rotulo}</span>
    <input type="text" value={valor} maxLength={100} onChange={(e) => aoMudar(e.target.value)} />
  </label>
);

const Numero = ({ rotulo, valor, aoMudar }) => (
  <label className="campo">
    <span className="rotulo">{rotulo}</span>
    <input type="number" inputMode="numeric" step="1" value={valor ?? ''} onChange={(e) => aoMudar(paraNumero(e.target.value))} />
  </label>
);

function QuadroCompacto({ rotulo, valor, aoMudar }) {
  const inputId = `campo-${rotulo.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="painel quadro-compacto">
      <label className="rotulo-compacto" htmlFor={inputId}>
        {rotulo}
      </label>
      <input
        id={inputId}
        className="input-compacto"
        type="number"
        inputMode="numeric"
        step="1"
        value={valor ?? ''}
        onChange={(e) => aoMudar(paraNumero(e.target.value))}
      />
    </div>
  );
}

function Par({ rotulo, valor, aoMudar }) {
  return (
    <fieldset className="painel par par-reduzido">
      <legend className="rotulo">{rotulo}</legend>
      <strong className="valor">{mostrar(valor.atual)}/{mostrar(valor.total)}</strong>
      <div className="barra" aria-hidden="true"><i style={{ width: `${porcento(valor)}%` }} /></div>
      <div className="duplo">
        <Numero rotulo="Atual" valor={valor.atual} aoMudar={(v) => aoMudar('atual', v)} />
        <Numero rotulo="Total" valor={valor.total} aoMudar={(v) => aoMudar('total', v)} />
      </div>
    </fieldset>
  );
}

export function Ficha({ id, aba }) {
  const [ficha, setFicha] = useState(null);
  const [carga, setCarga] = useState('carregando');
  const [salvo, setSalvo] = useState('salvo');
  const [mostrarStatus, setMostrarStatus] = useState(false);
  const temporizador = useRef(null);
  const pendente = useRef(null);

  useEffect(() => {
    let ativo = true;
    obterFicha(id)
      .then((f) => { if (ativo) { setFicha(f ?? null); setCarga(f ? 'ok' : 'inexistente'); } })
      .catch(() => ativo && setCarga('erro'));
    return () => { ativo = false; };
  }, [id]);

  const gravar = useCallback(async (f) => {
    setSalvo('salvando');
    try {
      await atualizarFicha({ ...f, atualizadoEm: new Date().toISOString() });
      setSalvo('salvo');
    } catch {
      setSalvo('erro');
    }
  }, []);

  // Grava na hora o que ainda estiver pendente (ao sair da página ou esconder o app).
  const descarregar = useCallback(() => {
    clearTimeout(temporizador.current);
    const f = pendente.current;
    pendente.current = null;
    if (f) gravar(f);
  }, [gravar]);

  useEffect(() => {
    const aoEsconder = () => document.visibilityState === 'hidden' && descarregar();
    window.addEventListener('pagehide', descarregar);
    document.addEventListener('visibilitychange', aoEsconder);
    return () => {
      window.removeEventListener('pagehide', descarregar);
      document.removeEventListener('visibilitychange', aoEsconder);
      descarregar();
    };
  }, [descarregar]);

  function alterar(mudar) {
    const nova = mudar(ficha);
    setFicha(nova);
    pendente.current = nova;
    setSalvo('salvando');
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(descarregar, 600);
  }
  const defina = (campo) => (v) => alterar((f) => ({ ...f, [campo]: v }));
  const definaPar = (campo) => (parte, v) => alterar((f) => ({ ...f, [campo]: { ...f[campo], [parte]: v } }));

  if (carga === 'carregando') return <p className="suave">Carregando...</p>;
  if (carga === 'erro') return <p className="vazio" role="alert">Não foi possível ler a ficha deste aparelho.</p>;
  if (carga === 'inexistente') return <p className="vazio">Ficha não encontrada neste aparelho. <a href="#/personagens">Voltar à lista</a></p>;

  const buffs = Array.isArray(ficha.buffs) ? [...ficha.buffs, '', ''].slice(0, 3) : ['', '', ''];
  const debuffs = Array.isArray(ficha.debuffs) ? [...ficha.debuffs, '', ''].slice(0, 3) : ['', '', ''];

  function mudarBuff(idx, valor) {
    const novos = [...buffs];
    novos[idx] = valor;
    alterar((f) => ({ ...f, buffs: novos }));
  }

  function mudarDebuff(idx, valor) {
    const novos = [...debuffs];
    novos[idx] = valor;
    alterar((f) => ({ ...f, debuffs: novos }));
  }

  return (
    <>
      <p className="trilha"><a href="#/personagens">Personagens</a> &gt; {nomeDe(ficha)}</p>
      <div className="topo-ficha-header">
        <h1>{nomeDe(ficha)}</h1>
        <CompartilharFicha ficha={ficha} rotulo="Compartilhar ficha" />
      </div>
      <p className={`estado estado--${salvo}`} role="status">{TEXTO_SALVO[salvo]}</p>

      <nav className="abas" aria-label="Seções da ficha">
        <a href={`#/personagens/${id}`} aria-current={aba ? undefined : 'page'}>Geral</a>
        <a href={`#/personagens/${id}/proficiencias`} aria-current={aba === 'proficiencias' ? 'page' : undefined}>Proficiências</a>
      </nav>

      {aba === 'proficiencias' ? (
        <PaginaProficiencias ficha={ficha} alterar={alterar} />
      ) : (
        <div className="ficha-geral">
          {/* TOP — Identificação e Pontos de Fluxo */}
          <h2>Identidade</h2>
          <div className="secao-identidade">
            <div className="campos-identidade">
              <Texto rotulo="Nome" valor={ficha.nome} aoMudar={defina('nome')} />
              <div className="linha-genero-raca">
                <Texto rotulo="Gênero" valor={ficha.genero} aoMudar={defina('genero')} />
                <label className="campo">
                  <span className="rotulo">Raça</span>
                  <select value={ficha.raca} onChange={(e) => defina('raca')(e.target.value)}>
                    {RACAS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <div className="fluxo-container">
              <QuadroCompacto rotulo="Pontos de Fluxo" valor={ficha.fluxo} aoMudar={defina('fluxo')} />
            </div>
          </div>

          {/* MID 1 — Status do personagem */}
          <section className="secao-status" aria-label="Status do personagem">
            <div className="status-topo">
              <button
                type="button"
                className="btn btn-status"
                onClick={() => setMostrarStatus((v) => !v)}
                aria-expanded={mostrarStatus}
              >
                Status <span className="seta" aria-hidden="true">{mostrarStatus ? '▲' : '▼'}</span>
              </button>
            </div>
            {mostrarStatus && (
              <div className="status-quadros">
                <div className="painel status-coluna">
                  <span className="rotulo status-titulo">Buffs</span>
                  {buffs.map((b, i) => (
                    <input
                      key={`buff-${i}`}
                      type="text"
                      className="input-status"
                      placeholder={`Buff ${i + 1}`}
                      value={b}
                      maxLength={100}
                      onChange={(e) => mudarBuff(i, e.target.value)}
                    />
                  ))}
                </div>
                <div className="painel status-coluna">
                  <span className="rotulo status-titulo">Debuffs</span>
                  {debuffs.map((d, i) => (
                    <input
                      key={`debuff-${i}`}
                      type="text"
                      className="input-status"
                      placeholder={`Debuff ${i + 1}`}
                      value={d}
                      maxLength={100}
                      onChange={(e) => mudarDebuff(i, e.target.value)}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* MID 2 — Corpo */}
          <h2>Corpo</h2>
          <div className="secao-corpo">
            <div className="corpo-linha-vital">
              <Par rotulo="Vida" valor={ficha.vida} aoMudar={definaPar('vida')} />
              <Par rotulo="Essencialidade" valor={ficha.essencialidade} aoMudar={definaPar('essencialidade')} />
            </div>
            <div className="corpo-linha-defesa">
              <QuadroCompacto rotulo="Defesa" valor={ficha.defesa} aoMudar={defina('defesa')} />
              <QuadroCompacto rotulo="Defesa especial" valor={ficha.defesaEspecial} aoMudar={defina('defesaEspecial')} />
            </div>
          </div>

          <p className="suave aviso-proximas-etapas">Passivas, origens e outros detalhes entram nas próximas etapas.</p>
        </div>
      )}
    </>
  );
}
