// Backup completo e restauração.
//
// O módulo não conhece o esquema do seu banco. Ele conversa com um objeto "armazenamento":
//   nomesDasStores           lista com os nomes das stores do IndexedDB (ex.: ['personagens', 'anotacoes', 'rolagens'])
//   lerTudo()                -> { [store]: registros[] }
//   substituirTudo(dados)    troca o conteúdo das stores presentes em `dados`, de forma atômica
//   lerPreferencias()        (opcional) -> objeto simples
//   gravarPreferencias(obj)  (opcional)
// criarArmazenamentoIndexedDB() abaixo implementa esse contrato.

import { montarEnvelopeBackup, validarEnvelopeBackup } from './Formatos.js';

const contar = (dados) => Object.fromEntries(Object.entries(dados).map(([nome, regs]) => [nome, regs.length]));

export async function exportarBackup(armazenamento, agora = new Date()) {
  const dados = await armazenamento.lerTudo();
  const preferencias = armazenamento.lerPreferencias ? await armazenamento.lerPreferencias() : undefined;
  const envelope = montarEnvelopeBackup(dados, preferencias, agora);
  return {
    texto: JSON.stringify(envelope, null, 2),
    nomeArquivo: `deadessence-backup-${agora.toISOString().slice(0, 10)}.json`,
    resumo: contar(dados),
  };
}

// Passo 1: valida o arquivo e compara com os dados atuais. Não altera nada.
export async function prepararRestauracao(texto, armazenamento) {
  const validacao = validarEnvelopeBackup(texto, armazenamento.nomesDasStores);
  if (!validacao.ok) return validacao;
  const atuais = await armazenamento.lerTudo();
  return {
    ok: true,
    dados: validacao.dados,
    preferencias: validacao.preferencias,
    exportadoEm: validacao.exportadoEm,
    resumoBackup: contar(validacao.dados),
    resumoAtual: contar(atuais),
  };
}

// Passo 2: só substitui se confirmou === true. Só as stores presentes no arquivo são trocadas.
export async function executarRestauracao(preparo, armazenamento, { confirmou } = {}) {
  if (confirmou !== true) return { ok: false, erro: 'A restauração precisa de confirmação explícita.' };
  try {
    await armazenamento.substituirTudo(preparo.dados);
  } catch (erro) {
    return { ok: false, erro: `A restauração falhou e os dados anteriores foram mantidos. (${erro.message})` };
  }
  let aviso = null;
  if (preparo.preferencias && armazenamento.gravarPreferencias) {
    try {
      await armazenamento.gravarPreferencias(preparo.preferencias);
    } catch {
      aviso = 'Os dados foram restaurados, mas as preferências não puderam ser aplicadas.';
    }
  }
  return { ok: true, resumo: preparo.resumoBackup, aviso };
}

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
      const tx = db.transaction(nomesDasStores, 'readonly');
      const pares = await Promise.all(
        nomesDasStores.map(async (nome) => [nome, await aguardar(tx.objectStore(nome).getAll())]),
      );
      return Object.fromEntries(pares);
    },

    // Uma única transação: se qualquer registro falhar, tudo é desfeito.
    substituirTudo(dados) {
      return new Promise((resolve, reject) => {
        const nomes = Object.keys(dados).filter((n) => nomesDasStores.includes(n));
        if (nomes.length === 0) return resolve();
        const tx = db.transaction(nomes, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transação cancelada.'));
        try {
          for (const nome of nomes) {
            const store = tx.objectStore(nome);
            store.clear();
            for (const registro of dados[nome]) store.put(registro);
          }
        } catch (erro) {
          tx.abort();
          reject(erro);
        }
      });
    },
  };
}