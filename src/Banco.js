// Acesso ao IndexedDB. A interface só usa estas funções, nunca o IndexedDB direto.
const NOME_BANCO = 'deadessence';
const VERSAO = 1;
export const STORE_PERSONAGENS = 'personagens';

let promessaBanco = null;

export function abrirBanco() {
  if (!promessaBanco) {
    promessaBanco = new Promise((resolve, reject) => {
      const pedido = indexedDB.open(NOME_BANCO, VERSAO);
      pedido.onupgradeneeded = (e) => {
        const db = pedido.result;
        // Mudanças futuras: acrescente blocos `if (e.oldVersion < 2) { ... }` que criam ou
        // alteram stores SEM apagar as existentes, para preservar os dados dos jogadores.
        if (e.oldVersion < 1) db.createObjectStore(STORE_PERSONAGENS, { keyPath: 'id' });
      };
      pedido.onsuccess = () => resolve(pedido.result);
      pedido.onerror = () => reject(pedido.error);
      pedido.onblocked = () => reject(new Error('Feche as outras abas do DeadEssence e tente de novo.'));
    });
    promessaBanco.catch(() => { promessaBanco = null; });
  }
  return promessaBanco;
}

// Resolve só quando a transação foi gravada (oncomplete).
async function executar(modo, operacao) {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PERSONAGENS, modo);
    const pedido = operacao(tx.objectStore(STORE_PERSONAGENS));
    tx.oncomplete = () => resolve(pedido.result);
    // O erro de um pedido (ex.: id repetido) vem em ev.target.error; tx.error ainda pode ser null aqui.
    tx.onerror = (ev) => reject(ev.target?.error ?? tx.error ?? new Error('Falha ao gravar.'));
    tx.onabort = () => reject(tx.error ?? new Error('Transação cancelada.'));
  });
}

export async function listarFichas() {
  const lista = await executar('readonly', (s) => s.getAll());
  return lista.sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
}
export const obterFicha = (id) => executar('readonly', (s) => s.get(id));
// add (não put): um id repetido dá erro em vez de sobrescrever outra ficha.
export const criarFicha = async (ficha) => { await executar('readwrite', (s) => s.add(ficha)); return ficha; };
export const atualizarFicha = async (ficha) => { await executar('readwrite', (s) => s.put(ficha)); return ficha; };
export const excluirFicha = (id) => executar('readwrite', (s) => s.delete(id));

// Pede ao navegador para não apagar os dados por falta de espaço. Não é garantia absoluta.
export async function pedirPersistencia() {
  try { return (await navigator.storage?.persist?.()) ?? false; } catch { return false; }
}