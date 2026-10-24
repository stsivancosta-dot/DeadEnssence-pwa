import { useRef, useState } from 'react';
import { CAMPO_NOME, TAMANHO_MAXIMO_BYTES } from './Formatos.js';
import {
  baixarArquivoJson,
  baixarFicha,
  compartilharFicha,
  importarFichaComoNova,
  lerArquivoFicha,
} from '../../fichas.js';
import { executarRestauracao, exportarBackup, prepararRestauracao } from '../../backup.js';
import './compartilhamento.css';

const descrever = (resumo) =>
  Object.entries(resumo)
    .map(([nome, qtd]) => `${qtd} em ${nome}`)
    .join(', ') || 'nenhum registro';

function Mensagem({ msg }) {
  if (!msg) return null;
  return (
    <p className={`de-msg de-msg--${msg.tipo}`} role={msg.tipo === 'erro' ? 'alert' : 'status'}>
      {msg.texto}
    </p>
  );
}

// Tela da ficha (Tela C). `ficha` é o registro já carregado na tela.
export function CompartilharFicha({ ficha }) {
  const [msg, setMsg] = useState(null);
  const [oferecerDownload, setOferecerDownload] = useState(false);

  async function aoCompartilhar() {
    setMsg(null);
    setOferecerDownload(false);
    const r = await compartilharFicha(ficha); // sem await antes: preserva o gesto do toque
    if (r.status === 'compartilhado') {
      setMsg({ tipo: 'ok', texto: 'Compartilhamento concluído neste aparelho. O app não consegue confirmar que a outra pessoa recebeu o arquivo.' });
    } else if (r.status === 'cancelado') {
      setMsg({ tipo: 'info', texto: 'Compartilhamento cancelado. Nada foi enviado.' });
    } else if (r.status === 'indisponivel') {
      setOferecerDownload(true);
      setMsg({ tipo: 'info', texto: 'Este navegador não compartilha arquivos diretamente. Baixe o arquivo e anexe em outro aplicativo, como mensagens ou e-mail.' });
    } else {
      setOferecerDownload(true);
      setMsg({ tipo: 'erro', texto: `Não foi possível abrir o compartilhamento (${r.erro?.message ?? 'erro desconhecido'}). Você ainda pode baixar o arquivo.` });
    }
  }

  function aoBaixar() {
    const r = baixarFicha(ficha);
    setMsg(
      r.status === 'baixado'
        ? { tipo: 'ok', texto: 'Download iniciado. Procure o arquivo na pasta de downloads e anexe-o em outro aplicativo para enviar.' }
        : { tipo: 'erro', texto: `Não foi possível gerar o arquivo (${r.erro?.message ?? 'erro desconhecido'}).` },
    );
  }

  return (
    <div className="de-bloco">
      <div className="de-acoes">
        <button type="button" onClick={aoCompartilhar}>Compartilhar ficha</button>
        {oferecerDownload && <button type="button" onClick={aoBaixar}>Baixar arquivo JSON</button>}
      </div>
      <Mensagem msg={msg} />
    </div>
  );
}

// Lista de personagens (Tela B). `criarFicha(ficha)` deve gravar com store.add.
export function ImportarFicha({ criarFicha, nomesExistentes = [], aoImportar }) {
  const [pendente, setPendente] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState(null);
  const entrada = useRef(null);

  async function aoEscolher(evento) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = ''; // permite escolher o mesmo arquivo outra vez
    setMsg(null);
    setPendente(null);
    if (!arquivo) return;
    const r = await lerArquivoFicha(arquivo);
    if (r.ok) setPendente(r.personagem);
    else setMsg({ tipo: 'erro', texto: r.erro });
  }

  async function confirmar() {
    setSalvando(true);
    const r = await importarFichaComoNova(pendente, criarFicha);
    setSalvando(false);
    if (!r.ok) return setMsg({ tipo: 'erro', texto: r.erro });
    setPendente(null);
    setMsg({ tipo: 'ok', texto: `Ficha "${r.ficha[CAMPO_NOME]}" adicionada como nova. Nenhuma ficha existente foi alterada.` });
    aoImportar?.(r.ficha);
  }

  function cancelar() {
    setPendente(null);
    setMsg({ tipo: 'info', texto: 'Importação cancelada. Nada foi salvo.' });
  }

  return (
    <div className="de-bloco">
      <input ref={entrada} type="file" accept=".json,application/json" hidden onChange={aoEscolher} />
      <button type="button" onClick={() => entrada.current?.click()}>Importar ficha</button>
      {pendente && (
        <div className="de-previa" role="group" aria-label="Confirmar importação">
          <p>Adicionar <strong>{pendente[CAMPO_NOME]}</strong> como nova ficha?</p>
          {nomesExistentes.includes(pendente[CAMPO_NOME]) && (
            <p className="de-msg de-msg--info">Já existe uma ficha com este nome. Será criada uma segunda ficha; a original não muda.</p>
          )}
          <div className="de-acoes">
            <button type="button" onClick={confirmar} disabled={salvando}>{salvando ? 'Salvando...' : 'Adicionar ficha'}</button>
            <button type="button" onClick={cancelar} disabled={salvando}>Cancelar</button>
          </div>
        </div>
      )}
      <Mensagem msg={msg} />
    </div>
  );
}

// Configurações / Dashboard. `armazenamento` segue o contrato de backup.js.
export function BackupCompleto({ armazenamento, aoRestaurar }) {
  const [preparo, setPreparo] = useState(null);
  const [confirmou, setConfirmou] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState(null);
  const entrada = useRef(null);

  async function exportar() {
    try {
      const { texto, nomeArquivo, resumo } = await exportarBackup(armazenamento);
      baixarArquivoJson(nomeArquivo, texto);
      setMsg({ tipo: 'ok', texto: `Download do backup iniciado (${descrever(resumo)}). Guarde o arquivo em um lugar seguro.` });
    } catch (erro) {
      setMsg({ tipo: 'erro', texto: `Não foi possível gerar o backup: ${erro.message}` });
    }
  }

  async function aoEscolher(evento) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';
    setMsg(null);
    setPreparo(null);
    setConfirmou(false);
    if (!arquivo) return;
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) return setMsg({ tipo: 'erro', texto: 'O arquivo é grande demais para ser um backup.' });
    try {
      const r = await prepararRestauracao(await arquivo.text(), armazenamento);
      if (r.ok) setPreparo(r);
      else setMsg({ tipo: 'erro', texto: r.erro });
    } catch (erro) {
      setMsg({ tipo: 'erro', texto: `Não foi possível ler o backup: ${erro.message}` });
    }
  }

  async function restaurar() {
    setOcupado(true);
    const r = await executarRestauracao(preparo, armazenamento, { confirmou });
    setOcupado(false);
    if (!r.ok) return setMsg({ tipo: 'erro', texto: r.erro });
    setPreparo(null);
    setConfirmou(false);
    setMsg({ tipo: 'ok', texto: `Backup restaurado (${descrever(r.resumo)}).${r.aviso ? ' ' + r.aviso : ''}` });
    aoRestaurar?.();
  }

  function cancelar() {
    setPreparo(null);
    setConfirmou(false);
    setMsg({ tipo: 'info', texto: 'Restauração cancelada. Seus dados não foram alterados.' });
  }

  return (
    <div className="de-bloco">
      <div className="de-acoes">
        <button type="button" onClick={exportar}>Exportar backup completo</button>
        <input ref={entrada} type="file" accept=".json,application/json" hidden onChange={aoEscolher} />
        <button type="button" onClick={() => entrada.current?.click()}>Restaurar backup</button>
      </div>
      {preparo && (
        <div className="de-previa" role="group" aria-label="Confirmar restauração">
          <p>O arquivo contém: {descrever(preparo.resumoBackup)}.</p>
          <p>Neste aparelho agora: {descrever(preparo.resumoAtual)}.</p>
          <p>Restaurar substitui os dados atuais dessas listas.</p>
          <button type="button" onClick={exportar} disabled={ocupado}>Exportar dados atuais antes</button>
          <label className="de-confirmar">
            <input type="checkbox" checked={confirmou} onChange={(e) => setConfirmou(e.target.checked)} />
            Entendo que os dados atuais serão substituídos.
          </label>
          <div className="de-acoes">
            <button type="button" onClick={restaurar} disabled={!confirmou || ocupado}>{ocupado ? 'Restaurando...' : 'Substituir meus dados'}</button>
            <button type="button" onClick={cancelar} disabled={ocupado}>Cancelar</button>
          </div>
        </div>
      )}
      <Mensagem msg={msg} />
    </div>
  );
}