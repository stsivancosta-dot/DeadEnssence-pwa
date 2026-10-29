import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PALETA, TAMANHOS_FONTE, sanitizarHtml, textoPuro } from './formato.js';
import { alinhar, alterarRecuo, alternar, alternarMarca, definirCor, definirTamanho, lerEstado, prepararEditor } from './editor.js';
import { acharConflito, baixarNota, comoNova, compartilharNota, lerArquivoNota, substituindo } from './arquivo.js';
import { criarAnotacao, excluirAnotacao, listarAnotacoes, obterAnotacao, pedirPersistencia, salvarAnotacao } from '../Banco.js';
import { novoId } from '../../modelos/Ficha.js';
import './notas.css';

const rotuloTitulo = (t) => t.trim() || '(sem título)';
const quando = (iso) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const TEXTO_SALVO = {
  salvo: 'Salvo neste dispositivo.',
  salvando: 'Salvando...',
  erro: 'Não foi possível salvar. As últimas alterações podem não estar gravadas; a próxima alteração tenta de novo.',
};

const Mensagem = ({ msg }) => (msg
  ? <p className={`nota-msg nota-msg--${msg.tipo}`} role={msg.tipo === 'erro' ? 'alert' : 'status'}>{msg.texto}</p>
  : null);

// ---------- Lista ----------
export function Anotacoes() {
  const [notas, setNotas] = useState(null);
  const [msg, setMsg] = useState(null);
  const [pendente, setPendente] = useState(null); // importação com conflito
  const entrada = useRef(null);

  const recarregar = useCallback(async () => {
    try { setNotas(await listarAnotacoes()); }
    catch (e) { setMsg({ tipo: 'erro', texto: `Não foi possível ler as anotações deste aparelho (${e.message}).` }); }
  }, []);
  useEffect(() => { recarregar(); }, [recarregar]);

  async function criar() {
    const agora = new Date().toISOString();
    const nota = { id: novoId(), titulo: '', conteudo: '<p><br></p>', criadoEm: agora, atualizadoEm: agora };
    try {
      await criarAnotacao(nota);
      pedirPersistencia();
      window.location.hash = `#/anotacoes/${nota.id}`;
    } catch (e) { setMsg({ tipo: 'erro', texto: `Não foi possível criar a anotação (${e.message}).` }); }
  }

  async function excluir(n) {
    if (!window.confirm(`Excluir a anotação "${rotuloTitulo(n.titulo)}"? Esta ação não pode ser desfeita.`)) return;
    try { await excluirAnotacao(n.id); setMsg(null); await recarregar(); }
    catch (e) { setMsg({ tipo: 'erro', texto: `Não foi possível excluir (${e.message}).` }); }
  }

  async function gravarImportada(nota, modo) {
    try {
      if (modo === 'substituir') await salvarAnotacao(nota); else await criarAnotacao(nota);
      setPendente(null);
      setMsg({ tipo: 'ok', texto: modo === 'substituir' ? 'Anotação substituída. As outras anotações não foram alteradas.' : `Anotação "${rotuloTitulo(nota.titulo)}" adicionada. As outras anotações não foram alteradas.` });
      await recarregar();
    } catch (e) { setMsg({ tipo: 'erro', texto: `Não foi possível salvar a anotação importada (${e.message}).` }); }
  }

  async function aoEscolher(ev) {
    const arquivo = ev.target.files?.[0];
    ev.target.value = '';
    setMsg(null); setPendente(null);
    if (!arquivo) return;
    const r = await lerArquivoNota(arquivo);
    if (!r.ok) return setMsg({ tipo: 'erro', texto: r.erro });
    const conflito = acharConflito(r.nota, notas ?? []);
    if (conflito) setPendente({ nota: r.nota, conflito });
    else await gravarImportada(r.nota, 'nova');
  }

  function substituir() {
    if (!window.confirm(`Substituir o conteúdo de "${rotuloTitulo(pendente.conflito.existente.titulo)}" pela anotação importada? O texto atual será perdido.`)) return;
    gravarImportada(substituindo(pendente.nota, pendente.conflito.existente), 'substituir');
  }

  return (
    <>
      <h1>Anotações</h1>
      <div className="acoes">
        <button type="button" className="btn" onClick={criar}>Nova anotação</button>
        <input ref={entrada} type="file" accept=".json,application/json" hidden onChange={aoEscolher} />
        <button type="button" className="btn" onClick={() => entrada.current?.click()}>Importar anotação</button>
      </div>
      {pendente && (
        <div className="painel nota-conflito" role="group" aria-label="Conflito na importação">
          <p>{pendente.conflito.tipo === 'id' ? 'Esta anotação já existe neste aparelho' : 'Já existe uma anotação com o mesmo título'}: <strong>{rotuloTitulo(pendente.conflito.existente.titulo)}</strong>. Nada foi alterado ainda.</p>
          <div className="acoes">
            <button type="button" className="btn" onClick={() => gravarImportada(comoNova(pendente.nota), 'nova')}>Importar como nova anotação</button>
            <button type="button" className="btn perigo" onClick={substituir}>Substituir a existente</button>
            <button type="button" className="btn" onClick={() => { setPendente(null); setMsg({ tipo: 'info', texto: 'Importação cancelada. Nada foi salvo.' }); }}>Cancelar</button>
          </div>
        </div>
      )}
      <Mensagem msg={msg} />
      <h2>Suas anotações</h2>
      {!notas && !msg && <p className="suave">Carregando...</p>}
      {notas && !notas.length && <p className="vazio">Você ainda não criou anotações.</p>}
      {notas && notas.length > 0 && (
        <div className="lista">
          {notas.map((n) => (
            <div className="painel" key={n.id}>
              <strong>{rotuloTitulo(n.titulo)}</strong>
              <span className="suave nota-previa">{textoPuro(n.conteudo).slice(0, 120) || 'Sem texto'}</span>
              <span className="suave">{quando(n.atualizadoEm)}</span>
              <div className="acoes">
                <a className="btn" href={`#/anotacoes/${n.id}`}>Abrir</a>
                <button type="button" className="btn perigo" onClick={() => excluir(n)}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ---------- Editor ----------
const LINHAS = { left: [[2, 16], [2, 11], [2, 16], [2, 11]], center: [[2, 16], [4, 14], [2, 16], [4, 14]], right: [[2, 16], [7, 16], [2, 16], [7, 16]] };
const IconeAlinhar = ({ tipo }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
    {LINHAS[tipo].map(([a, b], i) => <line key={i} x1={a} x2={b} y1={3 + i * 4} y2={3 + i * 4} />)}
  </svg>
);

function Botao({ rotulo, ativo, aoClicar, children }) {
  return (
    <button type="button" className="nota-botao" aria-label={rotulo} title={rotulo} aria-pressed={ativo === undefined ? undefined : !!ativo}
      onMouseDown={(e) => e.preventDefault()} onClick={aoClicar}>{children}</button>
  );
}

export function Nota({ id }) {
  const [carga, setCarga] = useState('carregando');
  const [inicial, setInicial] = useState('');
  const [titulo, setTitulo] = useState('');
  const [salvo, setSalvo] = useState('salvo');
  const [msg, setMsg] = useState(null);
  const [paleta, setPaleta] = useState(false);
  const [estado, setEstado] = useState({});
  const editorRef = useRef(null);
  const baseRef = useRef(null);
  const tituloRef = useRef('');
  const timer = useRef(null);
  const sujo = useRef(false);
  const excluida = useRef(false);
  const selecao = useRef(null);
  const tabLivre = useRef(false);

  useEffect(() => {
    let ativo = true;
    obterAnotacao(id)
      .then((n) => {
        if (!ativo) return;
        if (!n) return setCarga('inexistente');
        baseRef.current = { id: n.id, criadoEm: n.criadoEm };
        tituloRef.current = n.titulo;
        setTitulo(n.titulo);
        setInicial(sanitizarHtml(n.conteudo));
        setCarga('ok');
      })
      .catch(() => ativo && setCarga('erro'));
    return () => { ativo = false; };
  }, [id]);

  useEffect(() => { if (carga === 'ok') prepararEditor(); }, [carga]);

  // O objeto precisa ser sempre o mesmo: no React 19, um objeto novo faria o editor
  // ser reescrito a cada tecla, apagando o que o usuário digitou.
  const htmlInicial = useMemo(() => ({ __html: inicial }), [inicial]);

  const montarNota = useCallback(() => ({
    ...baseRef.current,
    titulo: tituloRef.current,
    conteudo: sanitizarHtml(editorRef.current ? editorRef.current.innerHTML : ''),
    atualizadoEm: new Date().toISOString(),
  }), []);

  const gravar = useCallback(async () => {
    if (excluida.current || !sujo.current) return;
    sujo.current = false;
    setSalvo('salvando');
    try { await salvarAnotacao(montarNota()); setSalvo('salvo'); }
    catch { sujo.current = true; setSalvo('erro'); }
  }, [montarNota]);

  const agendar = useCallback(() => {
    sujo.current = true;
    setSalvo('salvando');
    clearTimeout(timer.current);
    timer.current = setTimeout(gravar, 700);
  }, [gravar]);

  const descarregar = useCallback(() => { clearTimeout(timer.current); gravar(); }, [gravar]);

  // Grava o que estiver pendente ao sair da página ou esconder o app.
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

  // Lembra a seleção e o estado dos botões (negrito, cor, tamanho...).
  useEffect(() => {
    const aoMudar = () => {
      const ed = editorRef.current;
      const sel = window.getSelection();
      if (!ed || !sel.rangeCount || !ed.contains(sel.anchorNode)) return;
      selecao.current = sel.getRangeAt(0).cloneRange();
      setEstado(lerEstado());
    };
    document.addEventListener('selectionchange', aoMudar);
    return () => document.removeEventListener('selectionchange', aoMudar);
  }, [carga]);

  function executar(acao, { exigeSelecao = false } = {}) {
    const ed = editorRef.current;
    ed.focus({ preventScroll: true });
    const sel = window.getSelection();
    if (selecao.current && !ed.contains(sel.anchorNode)) { sel.removeAllRanges(); sel.addRange(selecao.current); }
    if (exigeSelecao && sel.isCollapsed) return setMsg({ tipo: 'info', texto: 'Selecione primeiro o trecho de texto.' });
    setMsg(null);
    acao(ed);
    agendar();
    setEstado(lerEstado());
  }

  function aoTeclar(e) {
    if (e.key === 'Escape') {
      tabLivre.current = true;
      return setMsg({ tipo: 'info', texto: 'Tab liberado: ao apertar Tab, o foco sai do editor.' });
    }
    if (e.key !== 'Tab') { tabLivre.current = false; return; }
    if (tabLivre.current) return;
    e.preventDefault();
    executar((ed) => alterarRecuo(ed, e.shiftKey ? -1 : 1));
  }

  function aoColar(e) { // cola só texto: evita trazer formatação ou código de fora
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    agendar();
  }

  async function aoCompartilhar() {
    descarregar();
    const r = await compartilharNota(montarNota()); // sem await antes: preserva o gesto do toque
    if (r.status === 'compartilhado') setMsg({ tipo: 'ok', texto: 'Compartilhamento concluído neste aparelho. O app não consegue confirmar que a outra pessoa recebeu o arquivo.' });
    else if (r.status === 'cancelado') setMsg({ tipo: 'info', texto: 'Compartilhamento cancelado. Nada foi enviado.' });
    else if (r.status === 'indisponivel') setMsg({ tipo: 'info', texto: 'Este navegador não compartilha arquivos diretamente. Use "Baixar JSON" e anexe o arquivo em outro aplicativo.' });
    else setMsg({ tipo: 'erro', texto: `Não foi possível abrir o compartilhamento (${r.erro?.message ?? 'erro desconhecido'}). Use "Baixar JSON".` });
  }

  function aoBaixar() {
    const r = baixarNota(montarNota());
    setMsg(r.status === 'baixado'
      ? { tipo: 'ok', texto: 'Download iniciado. Procure o arquivo na pasta de downloads.' }
      : { tipo: 'erro', texto: `Não foi possível gerar o arquivo (${r.erro?.message ?? 'erro desconhecido'}).` });
  }

  function exportarPdf() {
    descarregar();
    setMsg({ tipo: 'info', texto: 'Abrimos a janela de impressão do navegador. Para gerar o PDF, escolha "Salvar como PDF" como destino. O app não consegue confirmar que o arquivo foi salvo.' });
    window.print();
  }

  async function excluir() {
    if (!window.confirm(`Excluir a anotação "${rotuloTitulo(tituloRef.current)}"? Esta ação não pode ser desfeita.`)) return;
    excluida.current = true;
    clearTimeout(timer.current);
    try { await excluirAnotacao(id); window.location.hash = '#/anotacoes'; }
    catch (e) { excluida.current = false; setMsg({ tipo: 'erro', texto: `Não foi possível excluir (${e.message}).` }); }
  }

  if (carga === 'carregando') return <p className="suave">Carregando...</p>;
  if (carga === 'erro') return <p className="vazio" role="alert">Não foi possível ler a anotação deste aparelho.</p>;
  if (carga === 'inexistente') return <p className="vazio">Anotação não encontrada neste aparelho. <a href="#/anotacoes">Voltar à lista</a></p>;

  return (
    <>
      <p className="trilha"><a href="#/anotacoes">Anotações</a> &gt; {rotuloTitulo(titulo)}</p>
      <label className="campo nota-topo">
        <span className="rotulo">Título</span>
        <input type="text" maxLength={200} value={titulo} placeholder="Dê um título à anotação"
          onChange={(e) => { setTitulo(e.target.value); tituloRef.current = e.target.value; agendar(); }} />
      </label>
      <p className={`estado estado--${salvo}`} role="status">{TEXTO_SALVO[salvo]}</p>

      <div className="nota-barra" role="toolbar" aria-label="Formatação de texto" onMouseDown={(e) => e.preventDefault()}>
        <div className="nota-grupo">
          <Botao rotulo="Negrito" ativo={estado.negrito} aoClicar={() => executar(() => alternar('bold'))}><b>B</b></Botao>
          <Botao rotulo="Itálico" ativo={estado.italico} aoClicar={() => executar(() => alternar('italic'))}><i>I</i></Botao>
          <Botao rotulo="Sublinhado" ativo={estado.sublinhado} aoClicar={() => executar(() => alternar('underline'))}><u>U</u></Botao>
        </div>
        <div className="nota-grupo">
          <Botao rotulo="Alinhar à esquerda" ativo={estado.alinhamento === 'left'} aoClicar={() => executar(() => alinhar('justifyLeft'))}><IconeAlinhar tipo="left" /></Botao>
          <Botao rotulo="Centralizar" ativo={estado.alinhamento === 'center'} aoClicar={() => executar(() => alinhar('justifyCenter'))}><IconeAlinhar tipo="center" /></Botao>
          <Botao rotulo="Alinhar à direita" ativo={estado.alinhamento === 'right'} aoClicar={() => executar(() => alinhar('justifyRight'))}><IconeAlinhar tipo="right" /></Botao>
        </div>
        <div className="nota-grupo">
          <Botao rotulo="Diminuir recuo" aoClicar={() => executar((ed) => alterarRecuo(ed, -1))}>⇤</Botao>
          <Botao rotulo="Aumentar recuo" aoClicar={() => executar((ed) => alterarRecuo(ed, 1))}>⇥</Botao>
        </div>
        <div className="nota-grupo">
          {TAMANHOS_FONTE.map((px) => (
            <Botao key={px} rotulo={`Tamanho ${px} px`} ativo={estado.tamanho === px}
              aoClicar={() => executar((ed) => definirTamanho(ed, px), { exigeSelecao: true })}>{px}</Botao>
          ))}
        </div>
        <div className="nota-grupo">
          <Botao rotulo="Cor do texto" ativo={paleta} aoClicar={() => setPaleta(!paleta)}><span className="nota-cor-ico" style={{ borderBottomColor: estado.cor ?? 'currentColor' }}>A</span></Botao>
          <Botao rotulo="Marca-texto" aoClicar={() => executar(() => alternarMarca(), { exigeSelecao: true })}><span className="nota-marca-ico">ab</span></Botao>
        </div>
      </div>
      {paleta && (
        <div className="paleta" role="group" aria-label="Cor do texto">
          {PALETA.map((c) => (
            <button key={c.hex} type="button" className="cor" style={{ background: c.hex }} title={`${c.nome} ${c.hex}`}
              aria-label={`${c.nome} ${c.hex}`} aria-pressed={estado.cor === c.hex}
              onMouseDown={(e) => e.preventDefault()} onClick={() => executar(() => definirCor(c.hex), { exigeSelecao: true })} />
          ))}
        </div>
      )}

      <div className="nota-folha">
        <h1 className="so-impressao">{titulo}</h1>
        <div ref={editorRef} className="nota-editor" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true"
          aria-label="Texto da anotação" spellCheck dangerouslySetInnerHTML={htmlInicial}
          onInput={agendar} onKeyDown={aoTeclar} onBlur={() => { tabLivre.current = false; }} onPaste={aoColar} />
      </div>
      <p className="suave nota-dica">Tab aplica recuo ao parágrafo. Esc libera o Tab para navegar pelos controles.</p>
      <Mensagem msg={msg} />
      <div className="acoes nota-acoes">
        <button type="button" className="btn" onClick={aoCompartilhar}>Compartilhar</button>
        <button type="button" className="btn" onClick={aoBaixar}>Baixar JSON</button>
        <button type="button" className="btn" onClick={exportarPdf}>Exportar PDF</button>
        <button type="button" className="btn perigo" onClick={excluir}>Excluir</button>
      </div>
    </>
  );
}