// Acesso ao IndexedDB. A interface só usa estas funções, nunca o IndexedDB direto.
const NOME_BANCO = 'deadessence';
const VERSAO = 3;
export const STORE_PERSONAGENS = 'personagens';
export const STORE_ROLAGENS = 'rolagens';
export const STORE_ANOTACOES = 'anotacoes';

let promessaBanco = null;

export function abrirBanco() {
  if (!promessaBanco) {
    promessaBanco = new Promise((resolve, reject) => {
      const pedido = indexedDB.open(NOME_BANCO, VERSAO);
      pedido.onupgradeneeded = (e) => {
        const db = pedido.result;
        // Cada versão só ACRESCENTA stores. Nunca apague nem recrie as existentes:
        // é assim que as fichas dos jogadores sobrevivem às atualizações do app.
        if (e.oldVersion < 1) db.createObjectStore(STORE_PERSONAGENS, { keyPath: 'id' });
        if (e.oldVersion < 2) db.createObjectStore(STORE_ROLAGENS, { keyPath: 'id' });
        if (e.oldVersion < 3) db.createObjectStore(STORE_ANOTACOES, { keyPath: 'id' });
      };
      pedido.onsuccess = () => {
        const db = pedido.result;
        // Se uma versão nova do app precisar atualizar o banco, esta aba libera o caminho.
        db.onversionchange = () => { db.close(); promessaBanco = null; };
        resolve(db);
      };
      pedido.onerror = () => reject(pedido.error);
      pedido.onblocked = () => reject(new Error('Feche as outras abas do DeadEssence e tente de novo.'));
    });
    promessaBanco.catch(() => { promessaBanco = null; });
  }
  return promessaBanco;
}

// Resolve só quando a transação foi gravada (oncomplete).
async function executar(store, modo, operacao) {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, modo);
    const pedido = operacao(tx.objectStore(store));
    tx.oncomplete = () => resolve(pedido.result);
    // O erro de um pedido (ex.: id repetido) vem em ev.target.error; tx.error ainda pode ser null aqui.
    tx.onerror = (ev) => reject(ev.target?.error ?? tx.error ?? new Error('Falha ao gravar.'));
    tx.onabort = () => reject(tx.error ?? new Error('Transação cancelada.'));
  });
}

// ---------- Fichas ----------
export async function listarFichas() {
  const lista = await executar(STORE_PERSONAGENS, 'readonly', (s) => s.getAll());
  return lista.sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
}
export const obterFicha = (id) => executar(STORE_PERSONAGENS, 'readonly', (s) => s.get(id));
// add (não put): um id repetido dá erro em vez de sobrescrever outra ficha.
export const criarFicha = async (ficha) => { await executar(STORE_PERSONAGENS, 'readwrite', (s) => s.add(ficha)); return ficha; };
export const atualizarFicha = async (ficha) => { await executar(STORE_PERSONAGENS, 'readwrite', (s) => s.put(ficha)); return ficha; };
export const excluirFicha = (id) => executar(STORE_PERSONAGENS, 'readwrite', (s) => s.delete(id));

// ---------- Histórico de rolagens ----------
export async function listarRolagens() {
  const lista = await executar(STORE_ROLAGENS, 'readonly', (s) => s.getAll());
  return lista.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}
export const registrarRolagem = async (r) => { await executar(STORE_ROLAGENS, 'readwrite', (s) => s.add(r)); return r; };
export const atualizarRolagem = async (r) => { await executar(STORE_ROLAGENS, 'readwrite', (s) => s.put(r)); return r; };
export const limparRolagens = () => executar(STORE_ROLAGENS, 'readwrite', (s) => s.clear());

// ---------- Anotações ----------
export async function listarAnotacoes() {
  const lista = await executar(STORE_ANOTACOES, 'readonly', (s) => s.getAll());
  return lista.sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
}
export const obterAnotacao = (id) => executar(STORE_ANOTACOES, 'readonly', (s) => s.get(id));
// add: id repetido dá erro em vez de sobrescrever. salvar usa put (atualiza a anotação aberta).
export const criarAnotacao = async (n) => { await executar(STORE_ANOTACOES, 'readwrite', (s) => s.add(n)); return n; };
export const salvarAnotacao = async (n) => { await executar(STORE_ANOTACOES, 'readwrite', (s) => s.put(n)); return n; };
export const excluirAnotacao = (id) => executar(STORE_ANOTACOES, 'readwrite', (s) => s.delete(id));

// Pede ao navegador para não apagar os dados por falta de espaço. Não é garantia absoluta.
export async function pedirPersistencia() {
  try { return (await navigator.storage?.persist?.()) ?? false; } catch { return false; }
}