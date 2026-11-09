import { useRef, useState } from 'react';
import { CAMPO_NOME, TAMANHO_MAXIMO_BYTES } from './Formatos.js';
import {
  baixarArquivoJson,
  baixarFicha,
  compartilharArquivoJson,
  compartilharFicha,
  importarFichaComoNova,
  lerArquivoFicha,
} from './Fichas.js';
import {
  executarMesclagem,
  executarSubstituicao,
  exportarBackup,
  prepararRestauracao,
} from './Backup.js';
import { registrarUltimoBackup } from '../dados/preferencias.js';
import './compartilhamento.css';

export const descreverResumo = (resumo = {}) => {
  const nomesLegiveis = {
    personagens: 'personagem(ns)',
    anotacoes: 'anotação(ões)',
    rolagens: 'rolagem(ns)',
  };
  const partes = Object.entries(resumo).map(([nome, qtd]) => `${qtd} ${nomesLegiveis[nome] ?? nome}`);
  return partes.join(', ') || 'nenhum registro';
};

function Mensagem({ msg }) {
  if (!msg) return null;
  return (
    <p className={`de-msg de-msg--${msg.tipo}`} role={msg.tipo === 'erro' ? 'alert' : 'status'}>
      {msg.texto}
    </p>
  );
}

// Compartilhamento ou download individual da ficha (usado na tela de personagem)
export function CompartilharFicha({ ficha }) {
  const [msg, setMsg] = useState(null);
  const [oferecerDownload, setOferecerDownload] = useState(false);

  async function aoCompartilhar() {
    setMsg(null);
    setOferecerDownload(false);
    const r = await compartilharFicha(ficha);
    if (r.status === 'compartilhado') {
      setMsg({ tipo: 'ok', texto: 'Compartilhamento concluído. O arquivo da ficha foi enviado.' });
    } else if (r.status === 'cancelado') {
      setMsg({ tipo: 'info', texto: 'Compartilhamento cancelado. Nada foi enviado.' });
    } else if (r.status === 'indisponivel') {
      setOferecerDownload(true);
      setMsg({ tipo: 'info', texto: 'Este navegador não suporta compartilhamento direto de arquivos. Use o botão abaixo para baixar o arquivo .json.' });
    } else {
      setOferecerDownload(true);
      setMsg({ tipo: 'erro', texto: `Não foi possível abrir o compartilhamento (${r.erro?.message ?? 'erro desconhecido'}). Você ainda pode baixar o arquivo.` });
    }
  }

  function aoBaixar() {
    const r = baixarFicha(ficha);
    setMsg(
      r.status === 'baixado'
        ? { tipo: 'ok', texto: 'Download iniciado. O arquivo da ficha foi salvo no seu dispositivo.' }
        : { tipo: 'erro', texto: `Não foi possível gerar o arquivo (${r.erro?.message ?? 'erro desconhecido'}).` },
    );
  }

  return (
    <div className="de-bloco">
      <div className="de-acoes">
        <button type="button" className="btn" onClick={aoCompartilhar}>Compartilhar ficha</button>
        {oferecerDownload && <button type="button" className="btn" onClick={aoBaixar}>Baixar arquivo JSON</button>}
      </div>
      <Mensagem msg={msg} />
    </div>
  );
}

// Importação individual de ficha como nova (usado na lista de personagens)
export function ImportarFicha({ criarFicha, nomesExistentes = [], aoImportar }) {
  const [pendente, setPendente] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState(null);
  const entrada = useRef(null);

  async function aoEscolher(evento) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';
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
    setMsg({ tipo: 'ok', texto: `Ficha "${r.ficha[CAMPO_NOME]}" adicionada como nova com sucesso.` });
    aoImportar?.(r.ficha);
  }

  function cancelar() {
    setPendente(null);
    setMsg({ tipo: 'info', texto: 'Importação cancelada. Nada foi salvo.' });
  }

  return (
    <div className="de-bloco">
      <input ref={entrada} type="file" accept=".json,application/json" hidden onChange={aoEscolher} />
      <button type="button" className="btn" onClick={() => entrada.current?.click()}>Importar ficha</button>
      {pendente && (
        <div className="de-previa painel" role="group" aria-label="Confirmar importação">
          <p>Adicionar <strong>{pendente[CAMPO_NOME]}</strong> como nova ficha?</p>
          {nomesExistentes.includes(pendente[CAMPO_NOME]) && (
            <p className="de-msg de-msg--info">Já existe uma ficha com este nome. Será criada uma segunda ficha; a original não muda.</p>
          )}
          <div className="de-acoes">
            <button type="button" className="btn" onClick={confirmar} disabled={salvando}>{salvando ? 'Salvando...' : 'Adicionar ficha'}</button>
            <button type="button" className="btn" onClick={cancelar} disabled={salvando}>Cancelar</button>
          </div>
        </div>
      )}
      <Mensagem msg={msg} />
    </div>
  );
}

// Componente completo de gerenciamento de backup geral (exportação e importação em dois modos)
export function GerenciadorBackup({ armazenamento, aoAtualizar }) {
  const [preparo, setPreparo] = useState(null);
  const [modoEscolhido, setModoEscolhido] = useState('mesclar'); // 'mesclar' | 'substituir'
  const [modoConflito, setModoConflito] = useState('copiar'); // 'copiar' | 'manter' | 'sobrescrever'
  const [confirmouSubstituicao, setConfirmouSubstituicao] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState(null);
  const entradaArquivo = useRef(null);

  async function aoExportar(compartilhar = false) {
    if (!armazenamento) return;
    try {
      const { texto, nomeArquivo, resumo } = await exportarBackup(armazenamento);
      const agoraIso = new Date().toISOString();
      registrarUltimoBackup(agoraIso);

      if (compartilhar) {
        const r = await compartilharArquivoJson(nomeArquivo, texto, 'Backup Completo — DeadEssence RPG');
        if (r.status === 'compartilhado') {
          setMsg({ tipo: 'ok', texto: `Backup completo compartilhado com sucesso! (${descreverResumo(resumo)}).` });
          return;
        } else if (r.status === 'cancelado') {
          setMsg({ tipo: 'info', texto: 'Compartilhamento cancelado.' });
          return;
        }
        // Se indisponível ou erro, faz fallback para download tradicional
      }

      baixarArquivoJson(nomeArquivo, texto);
      setMsg({ tipo: 'ok', texto: `Download do backup concluído: ${nomeArquivo} (${descreverResumo(resumo)}). Guarde seu arquivo em um local seguro.` });
    } catch (erro) {
      setMsg({ tipo: 'erro', texto: `Não foi possível gerar o backup: ${erro.message}` });
    }
  }

  async function aoSelecionarArquivo(evento) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';
    setMsg(null);
    setPreparo(null);
    setConfirmouSubstituicao(false);
    if (!arquivo) return;
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      return setMsg({ tipo: 'erro', texto: 'O arquivo selecionado é grande demais para ser um backup do DeadEssence.' });
    }

    try {
      const texto = await arquivo.text();
      const r = await prepararRestauracao(texto, armazenamento);
      if (r.ok) {
        setPreparo(r);
        setModoEscolhido('mesclar');
      } else {
        setMsg({ tipo: 'erro', texto: r.erro });
      }
    } catch (erro) {
      setMsg({ tipo: 'erro', texto: `Falha ao ler o arquivo de backup: ${erro.message}` });
    }
  }

  async function aoConfirmarImportacao() {
    if (!preparo || !armazenamento) return;
    setOcupado(true);

    if (modoEscolhido === 'mesclar') {
      const r = await executarMesclagem(preparo, armazenamento, { modoConflito });
      setOcupado(false);
      if (!r.ok) return setMsg({ tipo: 'erro', texto: r.erro });
      setPreparo(null);
      setMsg({ tipo: 'ok', texto: `Dados do backup mesclados com sucesso! Novos registros: ${descreverResumo(r.resumo)}.${r.aviso ? ' ' + r.aviso : ''}` });
      aoAtualizar?.();
    } else {
      const r = await executarSubstituicao(preparo, armazenamento, { confirmou: confirmouSubstituicao });
      setOcupado(false);
      if (!r.ok) return setMsg({ tipo: 'erro', texto: r.erro });
      setPreparo(null);
      setConfirmouSubstituicao(false);
      setMsg({ tipo: 'ok', texto: `Backup restaurado com sucesso! Dados substituídos: ${descreverResumo(r.resumo)}.${r.aviso ? ' ' + r.aviso : ''}` });
      aoAtualizar?.();
    }
  }

  function aoCancelar() {
    setPreparo(null);
    setConfirmouSubstituicao(false);
    setMsg({ tipo: 'info', texto: 'Importação cancelada. Nenhum dado do seu dispositivo foi alterado.' });
  }

  return (
    <div className="gerenciador-backup">
      <Mensagem msg={msg} />

      {/* SEÇÃO DE EXPORTAÇÃO */}
      <section className="painel backup-card">
        <h2>Exportar backup completo</h2>
        <p className="suave">
          Gera um único arquivo <code>.json</code> contendo todas as fichas de personagens, proficiências, anotações,
          histórico de rolagens e preferências salvas neste aparelho.
        </p>
        <div className="de-acoes">
          {typeof navigator?.share === 'function' && (
            <button type="button" className="btn" onClick={() => aoExportar(true)}>
              Compartilhar backup (WhatsApp, Telegram...)
            </button>
          )}
          <button type="button" className="btn" onClick={() => aoExportar(false)}>
            Baixar arquivo JSON
          </button>
        </div>
      </section>

      {/* SEÇÃO DE IMPORTAÇÃO */}
      <section className="painel backup-card">
        <h2>Importar backup completo</h2>
        <p className="suave">
          Selecione um arquivo <code>.json</code> exportado pelo DeadEssence RPG para restaurar ou transferir seus dados para este dispositivo.
        </p>
        <div className="de-acoes">
          <input
            ref={entradaArquivo}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={aoSelecionarArquivo}
          />
          <button type="button" className="btn" onClick={() => entradaArquivo.current?.click()}>
            Selecionar arquivo JSON
          </button>
        </div>

        {/* PRÉVIA E MODOS DE IMPORTAÇÃO */}
        {preparo && (
          <div className="de-previa-completa" role="region" aria-label="Resumo e opções de importação">
            <h3>Conteúdo do backup identificado</h3>
            <div className="comparativo-backup">
              <div className="coluna-resumo">
                <strong>No arquivo de backup:</strong>
                <p>{descreverResumo(preparo.resumoBackup)}</p>
                {preparo.exportadoEm && (
                  <small className="suave">
                    Exportado em: {new Date(preparo.exportadoEm).toLocaleString('pt-BR')}
                  </small>
                )}
              </div>
              <div className="coluna-resumo">
                <strong>Neste aparelho agora:</strong>
                <p>{descreverResumo(preparo.resumoAtual)}</p>
              </div>
            </div>

            {preparo.totalConflitos > 0 && (
              <p className="aviso-conflito">
                ⚠️ Conflito identificado: {preparo.totalConflitos} registro(s) já existem com o mesmo identificador neste dispositivo.
              </p>
            )}

            <h3>Escolha como deseja importar</h3>
            <div className="opcoes-modo-importacao">
              <label className={`modo-opcao ${modoEscolhido === 'mesclar' ? 'ativa' : ''}`}>
                <input
                  type="radio"
                  name="modoImportacao"
                  value="mesclar"
                  checked={modoEscolhido === 'mesclar'}
                  onChange={() => setModoEscolhido('mesclar')}
                />
                <div>
                  <strong>Opção A: Mesclar dados</strong>
                  <p className="suave">
                    Preserva o que você já possui e adiciona os novos dados do backup.
                  </p>
                </div>
              </label>

              {modoEscolhido === 'mesclar' && preparo.totalConflitos > 0 && (
                <div className="configuracao-conflitos painel">
                  <span className="rotulo">Como resolver os registros conflitantes?</span>
                  <label className="opcao-radio">
                    <input
                      type="radio"
                      name="modoConflito"
                      value="copiar"
                      checked={modoConflito === 'copiar'}
                      onChange={() => setModoConflito('copiar')}
                    />
                    <span><strong>Criar cópias (Recomendado):</strong> Mantém o local intacto e adiciona o do backup com um novo identificador.</span>
                  </label>
                  <label className="opcao-radio">
                    <input
                      type="radio"
                      name="modoConflito"
                      value="manter"
                      checked={modoConflito === 'manter'}
                      onChange={() => setModoConflito('manter')}
                    />
                    <span><strong>Manter registros locais:</strong> Pula os itens conflitantes e importa apenas os novos.</span>
                  </label>
                  <label className="opcao-radio">
                    <input
                      type="radio"
                      name="modoConflito"
                      value="sobrescrever"
                      checked={modoConflito === 'sobrescrever'}
                      onChange={() => setModoConflito('sobrescrever')}
                    />
                    <span><strong>Atualizar locais:</strong> Substitui os dados locais que possuem o mesmo identificador pelos dados do backup.</span>
                  </label>
                </div>
              )}

              <label className={`modo-opcao ${modoEscolhido === 'substituir' ? 'ativa perigo' : ''}`}>
                <input
                  type="radio"
                  name="modoImportacao"
                  value="substituir"
                  checked={modoEscolhido === 'substituir'}
                  onChange={() => setModoEscolhido('substituir')}
                />
                <div>
                  <strong>Opção B: Substituir dados locais</strong>
                  <p className="suave">
                    Apaga os registros atuais deste aparelho e restaura exatamente o conteúdo presente no arquivo de backup.
                  </p>
                </div>
              </label>

              {modoEscolhido === 'substituir' && (
                <div className="alerta-substituicao painel">
                  <p className="de-msg de-msg--erro">
                    Atenção: todos os dados atuais deste aparelho serão substituídos! Recomendamos baixar um backup atual antes de continuar.
                  </p>
                  <button type="button" className="btn" onClick={() => aoExportar(false)} disabled={ocupado}>
                    Baixar backup dos dados atuais antes
                  </button>
                  <label className="confirmacao-checkbox">
                    <input
                      type="checkbox"
                      checked={confirmouSubstituicao}
                      onChange={(e) => setConfirmouSubstituicao(e.target.checked)}
                    />
                    <span>Estou ciente de que os dados atuais deste dispositivo serão substituídos.</span>
                  </label>
                </div>
              )}
            </div>

            <div className="de-acoes acoes-finais">
              <button
                type="button"
                className={`btn ${modoEscolhido === 'substituir' ? 'perigo' : ''}`}
                onClick={aoConfirmarImportacao}
                disabled={ocupado || (modoEscolhido === 'substituir' && !confirmouSubstituicao)}
              >
                {ocupado
                  ? 'Processando...'
                  : modoEscolhido === 'mesclar'
                  ? 'Confirmar e mesclar dados'
                  : 'Confirmar e substituir dados locais'}
              </button>
              <button type="button" className="btn" onClick={aoCancelar} disabled={ocupado}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
