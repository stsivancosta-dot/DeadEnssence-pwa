// Comandos de formatação sobre o editor (contentEditable).
// Usa document.execCommand: é uma API antiga, mas é a única que formata a seleção do navegador
// sem adicionar uma biblioteca de editor.
import { MARCA_TEXTO, NIVEL_RECUO_MAX, PASSO_RECUO_EM, paraHex } from './formato.js';

function cmd(nome, valor = null, css = true) {
  document.execCommand('styleWithCSS', false, css);
  return document.execCommand(nome, false, valor);
}

export function prepararEditor() {
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch { /* sem suporte */ }
}

export const alternar = (nome) => cmd(nome, null, false); // bold, italic, underline: geram <b>, <i>, <u>
export const alinhar = (nome) => cmd(nome); // justifyLeft, justifyCenter, justifyRight
export const definirCor = (hex) => cmd('foreColor', hex);

export function alternarMarca() {
  // O Chrome informa a cor do destaque em backColor (hiliteColor volta vazio); outros navegadores usam hiliteColor.
  const atual = String(document.queryCommandValue('backColor') || document.queryCommandValue('hiliteColor')).replace(/\s+/g, '');
  cmd('hiliteColor', atual === MARCA_TEXTO.replace(/\s+/g, '') ? 'transparent' : MARCA_TEXTO);
}

// O navegador só sabe tamanhos 1 a 7: pedimos o 7 e trocamos pelo tamanho em px escolhido.
export function definirTamanho(editor, px) {
  cmd('fontSize', '7');
  const alvos = [];
  for (const el of editor.querySelectorAll('font[size="7"], [style*="xxx-large"]')) {
    let alvo = el;
    if (el.tagName === 'FONT') {
      alvo = document.createElement('span');
      alvo.append(...el.childNodes);
      el.replaceWith(alvo);
    }
    alvo.style.fontSize = `${px}px`;
    for (const filho of alvo.querySelectorAll('[style*="font-size"]')) filho.style.removeProperty('font-size');
    alvos.push(alvo);
  }
  if (alvos.length) {
    const sel = window.getSelection();
    const r = document.createRange();
    r.setStartBefore(alvos[0]);
    r.setEndAfter(alvos[alvos.length - 1]);
    sel.removeAllRanges();
    sel.addRange(r);
  }
}

export function garantirBlocos(editor) {
  let grupo = null;
  for (const no of [...editor.childNodes]) {
    if (no.nodeType === 1 && /^(P|DIV)$/.test(no.tagName)) { grupo = null; continue; }
    if (!grupo) { grupo = document.createElement('p'); editor.insertBefore(grupo, no); }
    grupo.appendChild(no);
  }
}

// Recuo por parágrafo: cada nível soma 2em de margem à esquerda.
export function alterarRecuo(editor, delta) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  garantirBlocos(editor);
  const r = sel.getRangeAt(0);
  for (const bloco of editor.children) {
    if (!r.intersectsNode(bloco)) continue;
    const atual = Math.round((parseFloat(bloco.style.marginLeft) || 0) / PASSO_RECUO_EM);
    const novo = Math.max(0, Math.min(NIVEL_RECUO_MAX, atual + delta));
    if (novo) bloco.style.marginLeft = `${novo * PASSO_RECUO_EM}em`;
    else bloco.style.removeProperty('margin-left');
    if (!bloco.getAttribute('style')) bloco.removeAttribute('style');
  }
}

export function lerEstado() {
  const q = (n) => { try { return document.queryCommandState(n); } catch { return false; } };
  const sel = window.getSelection();
  let no = sel?.anchorNode;
  if (no && no.nodeType === 3) no = no.parentElement;
  return {
    negrito: q('bold'), italico: q('italic'), sublinhado: q('underline'),
    cor: paraHex(String(document.queryCommandValue('foreColor'))),
    tamanho: no ? parseInt(getComputedStyle(no).fontSize, 10) : null,
    alinhamento: q('justifyCenter') ? 'center' : q('justifyRight') ? 'right' : 'left',
  };
}