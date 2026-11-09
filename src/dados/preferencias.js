// Preferências pequenas (localStorage). Se o navegador bloquear o armazenamento, usa o padrão.
const CHAVE_HISTORICO = 'deadessence.historicoLigado';
const CHAVE_ULTIMO_BACKUP = 'deadessence.ultimoBackup';

export function historicoLigado() {
  try { return localStorage.getItem(CHAVE_HISTORICO) !== 'nao'; } catch { return true; }
}

export function definirHistorico(ligado) {
  try { localStorage.setItem(CHAVE_HISTORICO, ligado ? 'sim' : 'nao'); } catch { /* sem armazenamento */ }
}

export function obterUltimoBackup() {
  try { return localStorage.getItem(CHAVE_ULTIMO_BACKUP); } catch { return null; }
}

export function registrarUltimoBackup(dataIso = new Date().toISOString()) {
  try { localStorage.setItem(CHAVE_ULTIMO_BACKUP, dataIso); } catch { /* sem armazenamento */ }
}

export function obterTodasPreferencias() {
  return {
    historicoLigado: historicoLigado(),
    ultimoBackup: obterUltimoBackup(),
  };
}

export function salvarTodasPreferencias(novasPrefs = {}) {
  try {
    if (typeof novasPrefs.historicoLigado === 'boolean') {
      definirHistorico(novasPrefs.historicoLigado);
    }
    if (typeof novasPrefs.ultimoBackup === 'string') {
      registrarUltimoBackup(novasPrefs.ultimoBackup);
    }
  } catch {
    /* sem armazenamento */
  }
}
