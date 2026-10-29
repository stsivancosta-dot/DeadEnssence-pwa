import { useCallback, useEffect, useState } from 'react';
import {
  GRAUS_PROFICIENCIA, LIMITE_DADOS, MAX_FLUXO, TIPOS_DADO,
  rolagemLivre, rolagemTeste, somaFluxo, totalDoTeste,
} from './dados.js';
import { atualizarRolagem, limparRolagens, listarRolagens, registrarRolagem } from '../dados/banco.js';
import { definirHistorico, historicoLigado } from '../dados/preferencias.js';
import { novoId } from '../modelos/ficha.js';
import './rolagens.css';

const VISIVEIS = 20;

function Contador({ rotulo, valor, min, max, aoMudar }) {
  return (
    <div className="campo">
      <span className="rotulo">{rotulo}</span>
      <div className="contador">
        <button type="button" className="btn" aria-label={`Diminuir: ${rotulo}`} disabled={valor <= min} onClick={() => aoMudar(valor - 1)}>−</button>
        <output aria-live="polite">{valor}</output>
        <button type="button" className="btn" aria-label={`Aumentar: ${rotulo}`} disabled={valor >= max} onClick={() => aoMudar(valor + 1)}>+</button>
      </div>
    </div>
  );
}

function Dado({ valor, maior, escolhido, aoEscolher }) {
  const classe = `dado${maior ? ' maior' : ''}${escolhido ? ' escolhido' : ''}`;
  const conteudo = <>{valor}{maior && <span className="marca">maior</span>}</>;
  if (!aoEscolher) return <span className={classe}>{conteudo}</span>;
  return (
    <button type="button" className={classe} aria-pressed={!!escolhido}
      aria-label={`Resultado ${valor}${maior ? ', o maior' : ''}`} onClick={aoEscolher}>{conteudo}</button>
  );
}

const rotuloGrau = (id) => GRAUS_PROFICIENCIA.find((g) => g.id === id)?.rotulo ?? id;

function termosDoTeste(t) {
  const termos = [`${t.resultados[t.selecionado]} (D20)`];
  if (somaFluxo(t) > 0) termos.push(`${somaFluxo(t)} (Fluxo)`);
  if (t.bonus > 0) termos.push(`${t.bonus} (proficiência)`);
  return `${termos.join(' + ')} = ${totalDoTeste(t)}`;
}

function Registro({ r }) {
  const quando = new Date(r.criadoEm).toLocaleString('pt-BR');
  return (
    <li>
      <strong>{r.tipo === 'teste' ? `Teste, ${r.quantidade}D20` : `${r.quantidade}D${r.lados}`}</strong>
      {r.finalidade && <span className="suave"> ({r.finalidade})</span>}
      <div>Resultados: {r.resultados.join(', ')}{r.tipo === 'livre' && r.quantidade > 1 ? `, soma ${r.soma}` : ''}</div>
      {r.tipo === 'teste' && (
        <>
          <div>{r.selecionado === null ? 'Nenhum resultado selecionado.' : `Usado: ${r.resultados[r.selecionado]}`}</div>
          <div>Fluxo: {r.fluxo.pontos === 0 ? '0' : `${r.fluxo.pontos} (D8: ${r.fluxo.resultados.join(', ')})`}. Proficiência: {rotuloGrau(r.proficiencia)} (+{r.bonus})</div>
          {r.selecionado !== null && <div>{termosDoTeste(r)}</div>}
        </>
      )}
      <div className="suave">{quando}</div>
    </li>
  );
}

export function Rolagens() {
  const [registrar, setRegistrar] = useState(historicoLigado);
  const [historico, setHistorico] = useState(null);
  const [todas, setTodas] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [livre, setLivre] = useState({ lados: 20, quantidade: 1, finalidade: '' });
  const [teste, setTeste] = useState({ quantidade: 1, fluxo: 0, proficiencia: 'nenhuma', finalidade: '' });
  const [resLivre, setResLivre] = useState(null);
  const [resTeste, setResTeste] = useState(null); // { r, guardada }

  const recarregar = useCallback(async () => {
    try { setHistorico(await listarRolagens()); }
    catch (e) { setAviso(`Não foi possível ler o histórico deste aparelho (${e.message}).`); }
  }, []);
  useEffect(() => { recarregar(); }, [recarregar]);

  async function guardar(r) {
    try { await registrarRolagem(r); setAviso(null); await recarregar(); }
    catch (e) { setAviso(`A rolagem foi feita, mas não foi possível registrá-la no histórico (${e.message}).`); }
  }

  function aoRolarLivre() {
    const r = { ...rolagemLivre(livre), id: novoId(), criadoEm: new Date().toISOString() };
    setResLivre(r);
    if (registrar) guardar(r);
  }

  function aoRolarTeste() {
    const r = { ...rolagemTeste(teste), id: novoId(), criadoEm: new Date().toISOString() };
    setResTeste({ r, guardada: registrar });
    if (registrar) guardar(r);
  }

  async function escolher(indice) {
    const r = { ...resTeste.r, selecionado: resTeste.r.selecionado === indice ? null : indice };
    setResTeste({ ...resTeste, r });
    if (!resTeste.guardada) return;
    try { await atualizarRolagem(r); setAviso(null); await recarregar(); }
    catch (e) { setAviso(`Não foi possível atualizar o histórico (${e.message}).`); }
  }

  async function limpar() {
    if (!window.confirm('Apagar todo o histórico de rolagens? Esta ação não pode ser desfeita.')) return;
    try { await limparRolagens(); setAviso(null); await recarregar(); }
    catch (e) { setAviso(`Não foi possível limpar o histórico (${e.message}).`); }
  }

  const t = resTeste?.r;
  const maximo = t ? Math.max(...t.resultados) : null;
  const lista = historico ? (todas ? historico : historico.slice(0, VISIVEIS)) : [];

  return (
    <>
      <h1>Rolagens e testes</h1>
      <p className="suave">Dois quadros independentes: rolagens livres de qualquer dado e testes do sistema.</p>
      <div className="duas">
        <section className="painel">
          <h2>Rolagem livre</h2>
          <p className="suave">Escolha o dado e a quantidade. Todos são lançados de uma vez.</p>
          <div className="grupo-dados" role="group" aria-label="Tipo de dado">
            {TIPOS_DADO.map((l) => (
              <button key={l} type="button" className="btn" aria-pressed={livre.lados === l} onClick={() => setLivre({ ...livre, lados: l })}>D{l}</button>
            ))}
          </div>
          <Contador rotulo="Quantidade de dados" valor={livre.quantidade} min={1} max={LIMITE_DADOS} aoMudar={(q) => setLivre({ ...livre, quantidade: q })} />
          <label className="campo"><span className="rotulo">Finalidade (opcional)</span>
            <input type="text" maxLength={80} value={livre.finalidade} onChange={(e) => setLivre({ ...livre, finalidade: e.target.value })} /></label>
          <div className="acoes"><button type="button" className="btn" onClick={aoRolarLivre}>Rolar dados</button></div>
          {resLivre && (
            <div className="resultado" role="status">
              <strong>{resLivre.quantidade}D{resLivre.lados}</strong>{resLivre.finalidade && <span className="suave"> ({resLivre.finalidade})</span>}
              <div className="dados">{resLivre.resultados.map((v, i) => <Dado key={i} valor={v} />)}</div>
              {resLivre.quantidade > 1 && <p>Soma: {resLivre.soma}</p>}
            </div>
          )}
        </section>

        <section className="painel">
          <h2>Teste</h2>
          <p className="suave">Cada D20 é rolado separado. Você escolhe qual resultado usar; os D20 nunca são somados.</p>
          <Contador rotulo="Quantidade de D20" valor={teste.quantidade} min={1} max={LIMITE_DADOS} aoMudar={(q) => setTeste({ ...teste, quantidade: q })} />
          <Contador rotulo="Pontos de Fluxo (1D8 cada)" valor={teste.fluxo} min={0} max={MAX_FLUXO} aoMudar={(f) => setTeste({ ...teste, fluxo: f })} />
          <label className="campo"><span className="rotulo">Proficiência</span>
            <select value={teste.proficiencia} onChange={(e) => setTeste({ ...teste, proficiencia: e.target.value })}>
              {GRAUS_PROFICIENCIA.map((g) => <option key={g.id} value={g.id}>{g.rotulo} (+{g.bonus})</option>)}
            </select></label>
          <label className="campo"><span className="rotulo">Finalidade (opcional)</span>
            <input type="text" maxLength={80} value={teste.finalidade} onChange={(e) => setTeste({ ...teste, finalidade: e.target.value })} /></label>
          <div className="acoes"><button type="button" className="btn" onClick={aoRolarTeste}>Rolar teste</button></div>
          {t && (
            <div className="resultado" role="status">
              <strong>Teste, {t.quantidade}D20</strong>{t.finalidade && <span className="suave"> ({t.finalidade})</span>}
              <p className="suave">Toque no resultado que será usado. O maior é só uma referência.</p>
              <div className="dados">
                {t.resultados.map((v, i) => <Dado key={i} valor={v} maior={v === maximo} escolhido={t.selecionado === i} aoEscolher={() => escolher(i)} />)}
              </div>
              {t.fluxo.pontos > 0 && <p>Fluxo (D8): {t.fluxo.resultados.join(', ')}</p>}
              {t.bonus > 0 && <p>Proficiência {rotuloGrau(t.proficiencia)}: +{t.bonus}</p>}
              {t.selecionado === null
                ? <p className="suave">Nenhum resultado selecionado ainda.</p>
                : <p className="total">Resultado do teste: {termosDoTeste(t)}</p>}
            </div>
          )}
        </section>
      </div>

      <h2>Histórico de rolagens</h2>
      <label className="opcao">
        <input type="checkbox" checked={registrar} onChange={(e) => { setRegistrar(e.target.checked); definirHistorico(e.target.checked); }} />
        Registrar novas rolagens no histórico
      </label>
      {!registrar && <p className="suave">Registro desligado: as rolagens continuam funcionando, mas não são guardadas.</p>}
      {aviso && <p className="vazio" role="alert">{aviso}</p>}
      {historico && historico.length === 0 && <p className="vazio">Nenhuma rolagem registrada.</p>}
      {!historico && !aviso && <p className="suave">Carregando...</p>}
      {historico && historico.length > 0 && (
        <>
          <div className="acoes">
            <button type="button" className="btn perigo" onClick={limpar}>Limpar histórico</button>
            {historico.length > VISIVEIS && (
              <button type="button" className="btn" onClick={() => setTodas(!todas)}>{todas ? 'Mostrar só as recentes' : `Mostrar todas (${historico.length})`}</button>
            )}
          </div>
          <ul className="historico">{lista.map((r) => <Registro key={r.id} r={r} />)}</ul>
        </>
      )}
    </>
  );
}