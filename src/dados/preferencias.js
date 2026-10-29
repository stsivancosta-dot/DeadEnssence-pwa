// Preferências pequenas (localStorage). Se o navegador bloquear o armazenamento, usa o padrão.
const CHAVE_HISTORICO = 'deadessence.historicoLigado';

export function historicoLigado() {
  try { return localStorage.getItem(CHAVE_HISTORICO) !== 'nao'; } catch { return true; }
}
export function definirHistorico(ligado) {
  try { localStorage.setItem(CHAVE_HISTORICO, ligado ? 'sim' : 'nao'); } catch { /* sem armazenamento */ }
}