import { ATRIBUTOS, RACAS, fichaNova } from '../modelos/Ficha.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  atualizarFicha,
  criarFicha,
  excluirFicha,
  listarFichas,
  obterFicha,
  pedirPersistencia
} from '../dados/Banco.js';
import './Fichas.css';

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
    <div className="painel">
      <strong>{nomeDe(f)}</strong>
      <span className="suave">{f.raca}</span>
      <span className="suave">
        Vida {mostrar(f.vida.atual)}/{mostrar(f.vida.total)}, Essencialidade {mostrar(f.essencialidade.atual)}/{mostrar(f.essencialidade.total)}, Fluxo {mostrar(f.fluxo)}
      </span>
      <div className="acoes">
        <a className="btn" href={`#/personagens/${f.id}`}>Abrir ficha</a>
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
      <div className="acoes"><button type="button" className="btn" onClick={criar}>Criar personagem</button></div>
      {(erro || falha) && <p className="vazio" role="alert">{erro || falha}</p>}
      <h2>Suas fichas</h2>
      {!fichas && !erro && <p className="suave">Carregando...</p>}
      {fichas && !fichas.length && <p className="vazio">Você ainda não criou fichas.</p>}
      {fichas && fichas.length > 0 && <div className="lista">{fichas.map((f) => <Cartao key={f.id} f={f} aoExcluir={excluir} />)}</div>}
    </>
  );
}

const Texto = ({ rotulo, valor, aoMudar }) => (
  <label className="campo">
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

function Par({ rotulo, valor, aoMudar }) {
  return (
    <fieldset className="painel par">
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

export function Ficha({ id }) {
  const [ficha, setFicha] = useState(null);
  const [carga, setCarga] = useState('carregando');
  const [salvo, setSalvo] = useState('salvo');
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

  return (
    <>
      <p className="trilha"><a href="#/personagens">Personagens</a> &gt; {nomeDe(ficha)}</p>
      <h1>{nomeDe(ficha)}</h1>
      <p className={`estado estado--${salvo}`} role="status">{TEXTO_SALVO[salvo]}</p>

      <h2>Identidade</h2>
      <div className="grade">
        <Texto rotulo="Nome" valor={ficha.nome} aoMudar={defina('nome')} />
        <Texto rotulo="Gênero" valor={ficha.genero} aoMudar={defina('genero')} />
        <label className="campo">
          <span className="rotulo">Raça</span>
          <select value={ficha.raca} onChange={(e) => defina('raca')(e.target.value)}>
            {RACAS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
      </div>

      <h2>Corpo</h2>
      <div className="grade">
        <Par rotulo="Vida" valor={ficha.vida} aoMudar={definaPar('vida')} />
        <Numero rotulo="Defesa" valor={ficha.defesa} aoMudar={defina('defesa')} />
        <Numero rotulo="Defesa especial" valor={ficha.defesaEspecial} aoMudar={defina('defesaEspecial')} />
        <Par rotulo="Essencialidade" valor={ficha.essencialidade} aoMudar={definaPar('essencialidade')} />
        <Numero rotulo="Pontos de Fluxo" valor={ficha.fluxo} aoMudar={defina('fluxo')} />
      </div>

      <h2>Atributos</h2>
      <div className="grade">
        {ATRIBUTOS.map((a) => (
          <Numero key={a.id} rotulo={a.rotulo} valor={ficha.atributos[a.id]}
            aoMudar={(v) => alterar((f) => ({ ...f, atributos: { ...f.atributos, [a.id]: v } }))} />
        ))}
      </div>
      <p className="suave">Proficiências, passivas e origens, status e o triângulo de atributos entram nas próximas etapas.</p>
    </>
  );
}