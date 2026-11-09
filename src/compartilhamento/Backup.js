// Backup completo, exportação e restauração geral do DeadEssence RPG.
//
// O módulo não fixa esquema do banco. Ele conversa com um objeto "armazenamento":
//   nomesDasStores           lista com os nomes das stores do IndexedDB (ex.: ['personagens', 'anotacoes', 'rolagens'])
//   lerTudo()                -> { [store]: registros[] }
//   substituirTudo(dados)    troca o conteúdo das stores de forma atômica
//   mesclarTudo(dados, opts) adiciona registros ao armazenamento com controle de conflitos
//   lerPreferencias()        (opcional) -> objeto simples
//   gravarPreferencias(obj)  (opcional)
// criarArmazenamentoIndexedDB() abaixo implementa esse contrato.

import { montarEnvelopeBackup, validarEnvelopeBackup } from './Formatos.js';
import { novoId } from '../modelos/Ficha.js';

export const contar = (dados = {}) =>
  Object.fromEntries(Object.entries(dados).map(([nome, regs]) => [nome, Array.isArray(regs) ? regs.length : 0]));

export function formatarDataNome(agora = new Date()) {
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export async function exportarBackup(armazenamento, agora = new Date()) {
  const dados = await armazenamento.lerTudo();
  const preferencias = armazenamento.lerPreferencias ? await armazenamento.lerPreferencias() : undefined;
  const envelope = montarEnvelopeBackup(dados, preferencias, agora);
  const dataArquivo = formatarDataNome(agora);
  const nomeArquivo = `DeadEssence_Backup_${dataArquivo}.json`;

  return {
    texto: JSON.stringify(envelope, null, 2),
    nomeArquivo,
    resumo: contar(dados),
    envelope,
  };
}

// Passo 1: lê, valida e analisa o arquivo comparando com os dados atuais. Não altera nada.
export async function prepararRestauracao(texto, armazenamento) {
  const validacao = validarEnvelopeBackup(texto, armazenamento.nomesDasStores);
  if (!validacao.ok) return validacao;

  const atuais = await armazenamento.lerTudo();
  const resumoBackup = contar(validacao.dados);
  const resumoAtual = contar(atuais);

  // Mapeia conflitos de identificadores
  const conflitos = {};
  let totalConflitos = 0;

  for (const [store, registros] of Object.entries(validacao.dados)) {
    const idsAtuais = new Set((atuais[store] ?? []).map((r) => r.id).filter(Boolean));
    const qtdConflitos = registros.filter((r) => r.id && idsAtuais.has(r.id)).length;
    conflitos[store] = qtdConflitos;
    totalConflitos += qtdConflitos;
  }

  return {
    ok: true,
    dados: validacao.dados,
    extras: validacao.extras ?? [],
    preferencias: validacao.preferencias,
    versao: validacao.versao,
    aplicativo: validacao.aplicativo,
    exportadoEm: validacao.exportadoEm,
    resumoBackup,
    resumoAtual,
    conflitos,
    totalConflitos,
  };
}

// Passo 2A: Modo Mesclar dados (adiciona sem apagar o existente, resolvendo conflitos)
// modoConflito: 'copiar' (gera novos IDs) | 'manter' (preserva local e pula conflitante) | 'sobrescrever' (atualiza com o backup)
export async function executarMesclagem(preparo, armazenamento, { modoConflito = 'copiar' } = {}) {
  try {
    const resultado = await armazenamento.mesclarTudo(preparo.dados, { modoConflito });
    let aviso = null;
    if (preparo.preferencias && armazenamento.gravarPreferencias) {
      try {
        await armazenamento.gravarPreferencias(preparo.preferencias);
      } catch {
        aviso = 'Os dados foram mesclados, mas as preferências não puderam ser aplicadas.';
      }
    }
    return { ok: true, resumo: resultado.resumo, aviso };
  } catch (erro) {
    return { ok: false, erro: `A mesclagem falhou e nenhum dado foi corrompido. (${erro.message})` };
  }
}

// Passo 2B: Modo Substituir dados locais (substituição atômica completa)
export async function executarSubstituicao(preparo, armazenamento, { confirmou } = {}) {
  if (confirmou !== true) {
    return { ok: false, erro: 'A substituição exige confirmação explícita.' };
  }
  try {
    await armazenamento.substituirTudo(preparo.dados);
  } catch (erro) {
    return { ok: false, erro: `A substituição falhou e os dados anteriores foram mantidos. (${erro.message})` };
  }

  let aviso = null;
  if (preparo.preferencias && armazenamento.gravarPreferencias) {
    try {
      await armazenamento.gravarPreferencias(preparo.preferencias);
    } catch {
      aviso = 'Os dados foram substituídos, mas as preferências não puderam ser aplicadas.';
    }
  }

  return { ok: true, resumo: preparo.resumoBackup, aviso };
}

// Cria a ponte entre as operações de backup e o IndexedDB
export function criarArmazenamentoIndexedDB(db, nomesDasStores, { lerPreferencias, gravarPreferencias } = {}) {
  const aguardar = (req) =>
    new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  return {
    nomesDasStores,
    lerPreferencias,
    gravarPreferencias,

    async lerTudo() {
      // Se houver stores que não existem neste momento, filtra
      const storesDisponiveis = nomesDasStores.filter((nome) => db.objectStoreNames.contains(nome));
      if (storesDisponiveis.length === 0) return {};

      const tx = db.transaction(storesDisponiveis, 'readonly');
      const pares = await Promise.all(
        storesDisponiveis.map(async (nome) => [nome, await aguardar(tx.objectStore(nome).getAll())]),
      );
      return Object.fromEntries(pares);
    },

    // Uma única transação atômica para substituição: se qualquer registro falhar, tudo é revertido
    substituirTudo(dados) {
      return new Promise((resolve, reject) => {
        const nomes = Object.keys(dados).filter((n) => db.objectStoreNames.contains(n));
        if (nomes.length === 0) return resolve();
        const tx = db.transaction(nomes, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = (ev) => reject(ev.target?.error ?? tx.error ?? new Error('Falha ao gravar.'));
        tx.onabort = () => reject(tx.error || new Error('Transação cancelada.'));

        try {
          for (const nome of nomes) {
            const store = tx.objectStore(nome);
            store.clear();
            for (const registro of dados[nome]) {
              store.put(registro);
            }
          }
        } catch (erro) {
          tx.abort();
          reject(erro);
        }
      });
    },

    // Mescla dados com suporte a resolução de conflitos
    mesclarTudo(dados, { modoConflito = 'copiar' } = {}) {
      return new Promise(async (resolve, reject) => {
        const nomes = Object.keys(dados).filter((n) => db.objectStoreNames.contains(n));
        if (nomes.length === 0) return resolve({ resumo: {} });

        try {
          // Lê os registros atuais para identificar conflitos com exatidão
          const txLeitura = db.transaction(nomes, 'readonly');
          const atuaisPorStore = {};
          await Promise.all(
            nomes.map(async (nome) => {
              atuaisPorStore[nome] = await aguardar(txLeitura.objectStore(nome).getAll());
            }),
          );

          // Transação atômica de gravação
          const txEscrita = db.transaction(nomes, 'readwrite');
          const contadoresInseridos = {};

          txEscrita.oncomplete = () => resolve({ resumo: contadoresInseridos });
          txEscrita.onerror = (ev) => reject(ev.target?.error ?? txEscrita.error ?? new Error('Falha ao mesclar dados.'));
          txEscrita.onabort = () => reject(txEscrita.error || new Error('Transação cancelada.'));

          // Mapeamento de IDs antigos para novos IDs (para manter referências)
          const mapaIds = {};

          for (const nome of nomes) {
            const store = txEscrita.objectStore(nome);
            const existentes = atuaisPorStore[nome] ?? [];
            const idsExistentes = new Set(existentes.map((r) => r.id).filter(Boolean));
            let inseridos = 0;

            for (const item of dados[nome]) {
              const temConflito = item.id && idsExistentes.has(item.id);

              if (!temConflito) {
                // Não há conflito: insere diretamente
                store.put(item);
                inseridos++;
              } else if (modoConflito === 'copiar') {
                // Conflito: gera nova cópia com novo ID
                const idAntigo = item.id;
                const idNovo = novoId();
                mapaIds[idAntigo] = idNovo;

                const copia = {
                  ...item,
                  id: idNovo,
                  nome: item.nome ? `${item.nome} (cópia)` : item.nome,
                  titulo: item.titulo ? `${item.titulo} (cópia)` : item.titulo,
                  atualizadoEm: new Date().toISOString(),
                };
                store.put(copia);
                inseridos++;
              } else if (modoConflito === 'sobrescrever') {
                // Conflito: sobrescreve o existente
                store.put(item);
                inseridos++;
              } else if (modoConflito === 'manter') {
                // Conflito: mantém o local e pula o do backup
                // (não faz put)
              }
            }
            contadoresInseridos[nome] = inseridos;
          }
        } catch (erro) {
          reject(erro);
        }
      });
    },
  };
}
