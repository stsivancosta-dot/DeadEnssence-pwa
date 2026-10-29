// Formato das anotações: constantes, higienização do HTML e arquivo JSON de transporte.
// O conteúdo é guardado como HTML restrito: só os elementos e estilos abaixo sobrevivem.
import { novoId } from '../../modelos/Ficha.js';

export const FORMATO_NOTA = 'deadessence-anotacao';
export const VERSAO_NOTA = 1;
export const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;
export const TAMANHOS_FONTE = [12, 14, 16, 24];
export const PASSO_RECUO_EM = 2;
export const NIVEL_RECUO_MAX = 8;
// Marca-texto: amarelo translúcido, para não prejudicar a leitura.
export const MARCA_TEXTO = 'rgba(245, 204, 5, 0.35)';
export const PALETA = [
  { nome: 'Cinza claro', hex: '#CCCCCC' }, { nome: 'Cinza', hex: '#A5A5A5' },
  { nome: 'Cinza médio', hex: '#737373' }, { nome: 'Cinza escuro', hex: '#404040' },
  { nome: 'Preto', hex: '#000000' }, { nome: 'Violeta', hex: '#864DFF' },
  { nome: 'Magenta', hex: '#E153FF' }, { nome: 'Vermelho', hex: '#FF314E' },
  { nome: 'Laranja', hex: '#EF724A' }, { nome: 'Amarelo', hex: '#F5CC05' },
  { nome: 'Verde', hex: '#57E780' }, { nome: 'Turquesa', hex: '#4DDCE5' },
  { nome: 'Azul claro', hex: '#00A3F4' }, { nome: 'Azul', hex: '#2E71FF' },
];

const HEXES = new Set(PALETA.map((c) => c.hex));
const BLOCOS = new Set(['P', 'DIV']);
const INLINE = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'SPAN']);
const VIRAM_BLOCO = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE']);
const DESCARTAR = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT', 'TEXTAREA', 'SELECT', 'SVG', 'MATH']);
const semEspacos = (s) => String(s).replace(/\s+/g, '').toLowerCase();

// Aceita #rrggbb e rgb(r, g, b); devolve #RRGGBB ou null.
export function paraHex(valor) {
  const v = String(valor).trim().toLowerCase();
  let m = v.match(/^#([0-9a-f]{6})$/);
  if (m) return `#${m[1].toUpperCase()}`;
  m = v.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);
  if (!m) return null;
  return `#${[m[1], m[2], m[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export const ehMarcaTexto = (valor) => semEspacos(valor) === semEspacos(MARCA_TEXTO);

function estilosPermitidos(el, ehBloco) {
  const s = el.style;
  const saida = [];
  const tamanho = s.getPropertyValue('font-size').match(/^(\d+)px$/);
  if (tamanho && TAMANHOS_FONTE.includes(Number(tamanho[1]))) saida.push(`font-size: ${tamanho[1]}px`);
  const cor = paraHex(s.getPropertyValue('color'));
  if (cor && HEXES.has(cor)) saida.push(`color: ${cor}`);
  if (ehMarcaTexto(s.getPropertyValue('background-color'))) saida.push(`background-color: ${MARCA_TEXTO}`);
  if (ehBloco) {
    const alinhamento = s.getPropertyValue('text-align');
    if (['left', 'center', 'right'].includes(alinhamento)) saida.push(`text-align: ${alinhamento}`);
    const recuo = s.getPropertyValue('margin-left').match(/^(\d+(?:\.\d+)?)em$/);
    const em = recuo ? Number(recuo[1]) : 0;
    if (em > 0 && em <= PASSO_RECUO_EM * NIVEL_RECUO_MAX && em % PASSO_RECUO_EM === 0) saida.push(`margin-left: ${em}em`);
  }
  return saida.join('; ');
}

function copiar(origem, destino, doc, profundidade = 0) {
  if (profundidade > 60) return;
  for (const no of origem.childNodes) {
    if (no.nodeType === 3) { destino.appendChild(doc.createTextNode(no.nodeValue)); continue; }
    if (no.nodeType !== 1) continue;
    const tag = no.tagName.toUpperCase();
    if (DESCARTAR.has(tag)) continue;
    if (tag === 'BR') { destino.appendChild(doc.createElement('br')); continue; }
    const ehBloco = BLOCOS.has(tag) || VIRAM_BLOCO.has(tag);
    if (ehBloco || INLINE.has(tag)) {
      const el = doc.createElement(VIRAM_BLOCO.has(tag) ? 'p' : tag.toLowerCase());
      const estilo = estilosPermitidos(no, ehBloco);
      if (estilo) el.setAttribute('style', estilo);
      copiar(no, el, doc, profundidade + 1);
      destino.appendChild(el);
    } else {
      copiar(no, destino, doc, profundidade + 1); // tag desconhecida: mantém só o texto
    }
  }
}

// Todo conteúdo solto na raiz vira parágrafo.
function agruparSoltos(raiz, doc) {
  let grupo = null;
  for (const no of [...raiz.childNodes]) {
    if (no.nodeType === 1 && BLOCOS.has(no.tagName.toUpperCase())) { grupo = null; continue; }
    if (no.nodeType === 3 && !no.nodeValue.trim() && !grupo) { no.remove(); continue; }
    if (!grupo) { grupo = doc.createElement('p'); raiz.insertBefore(grupo, no); }
    grupo.appendChild(no);
  }
}

export function sanitizarHtml(html) {
  const doc = new DOMParser().parseFromString(`<body>${String(html ?? '')}</body>`, 'text/html'); // documento inerte
  const raiz = doc.createElement('div');
  copiar(doc.body, raiz, doc);
  agruparSoltos(raiz, doc);
  if (!raiz.firstChild) raiz.innerHTML = '<p><br></p>';
  return raiz.innerHTML;
}

export function textoPuro(html) {
  const doc = new DOMParser().parseFromString(`<body>${String(html ?? '').replace(/<\/(p|div)>|<br\s*\/?>/gi, ' ')}</body>`, 'text/html');
  return doc.body.textContent.replace(/\s+/g, ' ').trim();
}

// ---------- Arquivo JSON de uma anotação ----------
export function montarEnvelopeNota(nota, agora = new Date()) {
  return {
    formato: FORMATO_NOTA, versao: VERSAO_NOTA, exportadoEm: agora.toISOString(),
    anotacao: { id: nota.id, titulo: nota.titulo, conteudo: nota.conteudo, criadoEm: nota.criadoEm, atualizadoEm: nota.atualizadoEm },
  };
}

const iso = (v) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : new Date().toISOString());

export function validarEnvelopeNota(texto) {
  if (typeof texto !== 'string' || !texto.trim()) return { ok: false, erro: 'O arquivo está vazio.' };
  if (texto.length > TAMANHO_MAXIMO_BYTES) return { ok: false, erro: 'O arquivo é grande demais.' };
  let env;
  try { env = JSON.parse(texto); } catch { return { ok: false, erro: 'O arquivo não é um JSON válido.' }; }
  if (!env || typeof env !== 'object' || env.formato !== FORMATO_NOTA) {
    return { ok: false, erro: 'Este arquivo não é uma anotação do DeadEssence.' };
  }
  if (!Number.isInteger(env.versao) || env.versao < 1) return { ok: false, erro: 'O arquivo não informa uma versão válida.' };
  if (env.versao > VERSAO_NOTA) return { ok: false, erro: 'O arquivo foi criado por uma versão mais nova do app. Atualize o app e tente de novo.' };
  const a = env.anotacao;
  if (!a || typeof a !== 'object' || Array.isArray(a) || typeof a.conteudo !== 'string') {
    return { ok: false, erro: 'O arquivo não contém o texto de uma anotação.' };
  }
  return {
    ok: true,
    nota: {
      id: typeof a.id === 'string' && /^[\w-]{8,64}$/.test(a.id) ? a.id : novoId(),
      titulo: typeof a.titulo === 'string' ? a.titulo.slice(0, 200) : '',
      conteudo: sanitizarHtml(a.conteudo),
      criadoEm: iso(a.criadoEm),
      atualizadoEm: iso(a.atualizadoEm),
    },
  };
}