// Ações sobre a ficha individual: compartilhar, baixar e importar como nova.
//
// Importante para celulares: navigator.share só funciona dentro de um gesto do usuário
// (toque). Por isso compartilharFicha() recebe a ficha JÁ CARREGADA e não faz nenhum
// await antes de chamar navigator.share. Não leia o IndexedDB dentro do clique.

import {
  CAMPO_NOME,
  TAMANHO_MAXIMO_BYTES,
  montarEnvelopeFicha,
  validarEnvelopeFicha,
} from './Formatos.js';

const TIPO_MIME = 'application/json';

export function textoFicha(ficha) {
  return JSON.stringify(montarEnvelopeFicha(ficha), null, 2);
}

export function nomeArquivoFicha(ficha) {
  const base = String(ficha[CAMPO_NOME] ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${base || 'ficha'}-deadessence.json`;
}

// Retorna { status }:
//  'compartilhado'  a tela nativa concluiu (o navegador não confirma a entrega)
//  'cancelado'      o usuário fechou a tela de compartilhamento
//  'indisponivel'   o navegador não compartilha arquivos: ofereça baixarFicha()
//  'erro'           falha inesperada (inclui `erro`): ofereça baixarFicha()
export async function compartilharFicha(ficha, nav = globalThis.navigator) {
  let arquivo;
  try {
    arquivo = new File([textoFicha(ficha)], nomeArquivoFicha(ficha), { type: TIPO_MIME });
  } catch (erro) {
    return { status: 'erro', erro };
  }
  const suportado =
    nav && typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [arquivo] });
  if (!suportado) return { status: 'indisponivel' };

  try {
    await nav.share({ files: [arquivo], title: `Ficha: ${ficha[CAMPO_NOME]}` });
    return { status: 'compartilhado' };
  } catch (erro) {
    if (erro && erro.name === 'AbortError') return { status: 'cancelado' };
    return { status: 'erro', erro };
  }
}

export function baixarArquivoJson(nomeArquivo, texto) {
  const url = URL.createObjectURL(new Blob([texto], { type: TIPO_MIME }));
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function baixarFicha(ficha) {
  try {
    baixarArquivoJson(nomeArquivoFicha(ficha), textoFicha(ficha));
    return { status: 'baixado' };
  } catch (erro) {
    return { status: 'erro', erro };
  }
}

// Lê e valida o arquivo escolhido. Não salva nada.
export async function lerArquivoFicha(arquivo) {
  if (!arquivo) return { ok: false, erro: 'Nenhum arquivo selecionado.' };
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) return { ok: false, erro: 'O arquivo é grande demais para ser uma ficha.' };
  let texto;
  try {
    texto = await arquivo.text();
  } catch {
    return { ok: false, erro: 'Não foi possível ler o arquivo.' };
  }
  return validarEnvelopeFicha(texto);
}

function gerarId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const bytes = c.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// criarFicha(ficha) é a função de gravação do app. Ela DEVE usar store.add (não put),
// para que um id repetido gere erro em vez de sobrescrever outra ficha.
export async function importarFichaComoNova(personagem, criarFicha) {
  const nova = { ...personagem, id: gerarId() };
  try {
    const salva = await criarFicha(nova);
    return { ok: true, ficha: salva ?? nova };
  } catch (erro) {
    return { ok: false, erro: `Não foi possível salvar a ficha: ${erro.message}` };
  }
}