// Compartilhar, baixar e importar anotações em JSON (mesmo princípio das fichas).
import { novoId } from '../../modelos/Ficha.js';
import { baixarArquivoJson } from '../../compartilhamento/Fichas.js';
import { TAMANHO_MAXIMO_BYTES, montarEnvelopeNota, validarEnvelopeNota } from './formato.js';

const TIPO_MIME = 'application/json';
export const textoNota = (nota) => JSON.stringify(montarEnvelopeNota(nota), null, 2);

export function nomeArquivoNota(nota) {
  const base = String(nota.titulo ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `${base || 'anotacao'}-deadessence-nota.json`;
}

// Retorna { status }: 'compartilhado' | 'cancelado' | 'indisponivel' | 'erro'.
// Não faça await antes desta chamada: navigator.share exige o gesto do toque.
export async function compartilharNota(nota, nav = globalThis.navigator) {
  let arquivo;
  try { arquivo = new File([textoNota(nota)], nomeArquivoNota(nota), { type: TIPO_MIME }); }
  catch (erro) { return { status: 'erro', erro }; }
  const suportado = nav && typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [arquivo] });
  if (!suportado) return { status: 'indisponivel' };
  try {
    await nav.share({ files: [arquivo], title: `Anotação: ${nota.titulo || '(sem título)'}` });
    return { status: 'compartilhado' };
  } catch (erro) {
    return erro && erro.name === 'AbortError' ? { status: 'cancelado' } : { status: 'erro', erro };
  }
}

export function baixarNota(nota) {
  try { baixarArquivoJson(nomeArquivoNota(nota), textoNota(nota)); return { status: 'baixado' }; }
  catch (erro) { return { status: 'erro', erro }; }
}

export async function lerArquivoNota(arquivo) {
  if (!arquivo) return { ok: false, erro: 'Nenhum arquivo selecionado.' };
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) return { ok: false, erro: 'O arquivo é grande demais.' };
  try { return validarEnvelopeNota(await arquivo.text()); }
  catch { return { ok: false, erro: 'Não foi possível ler o arquivo.' }; }
}

// Conflito = mesma anotação (id) ou mesmo título. Nunca sobrescreve em silêncio.
export function acharConflito(nota, existentes) {
  const porId = existentes.find((n) => n.id === nota.id);
  if (porId) return { tipo: 'id', existente: porId };
  const titulo = nota.titulo.trim().toLowerCase();
  const porTitulo = titulo && existentes.find((n) => n.titulo.trim().toLowerCase() === titulo);
  return porTitulo ? { tipo: 'titulo', existente: porTitulo } : null;
}
export const comoNova = (nota) => ({ ...nota, id: novoId(), atualizadoEm: new Date().toISOString() });
export const substituindo = (nota, existente) => ({ ...nota, id: existente.id, criadoEm: existente.criadoEm, atualizadoEm: new Date().toISOString() });