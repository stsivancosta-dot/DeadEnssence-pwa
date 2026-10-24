// Formatos dos arquivos JSON do DeadEssence PWA: ficha individual e backup completo.
// Tudo aqui é puro (sem DOM, sem IndexedDB), para poder ser testado no Node.
//
// Nenhuma regra do RPG é validada de propósito: o arquivo é tratado só como dado.
// A única exigência sobre a ficha é ter nome.

export const FORMATO_FICHA = 'deadessence-ficha';
export const FORMATO_BACKUP = 'deadessence-backup';
export const VERSAO_FORMATO = 1;

// Ajuste se a ficha do app guardar o nome em outro campo.
export const CAMPO_NOME = 'nome';

// Limite técnico para impedir que um arquivo gigante trave o celular.
export const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;

const CHAVES_PERIGOSAS = new Set(['__proto__', 'constructor', 'prototype']);
const PROFUNDIDADE_MAXIMA = 30;

const ehObjetoSimples = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Reconstrói o valor descartando chaves que poderiam alterar protótipos
// quando o objeto for copiado ou mesclado depois.
export function limparDados(valor, profundidade = 0) {
  if (profundidade > PROFUNDIDADE_MAXIMA) throw new Error('O arquivo tem estrutura aninhada demais.');
  if (Array.isArray(valor)) return valor.map((v) => limparDados(v, profundidade + 1));
  if (ehObjetoSimples(valor)) {
    const saida = {};
    for (const [chave, v] of Object.entries(valor)) {
      if (!CHAVES_PERIGOSAS.has(chave)) saida[chave] = limparDados(v, profundidade + 1);
    }
    return saida;
  }
  return valor;
}

function interpretarJson(texto) {
  if (typeof texto !== 'string' || !texto.trim()) return { ok: false, erro: 'O arquivo está vazio.' };
  if (texto.length > TAMANHO_MAXIMO_BYTES) return { ok: false, erro: 'O arquivo é grande demais.' };
  try {
    return { ok: true, dados: JSON.parse(texto) };
  } catch {
    return { ok: false, erro: 'O arquivo não é um JSON válido.' };
  }
}

function conferirVersao(envelope) {
  if (!Number.isInteger(envelope.versao) || envelope.versao < 1) {
    return 'O arquivo não informa uma versão de formato válida.';
  }
  if (envelope.versao > VERSAO_FORMATO) {
    return 'O arquivo foi criado por uma versão mais nova do app. Atualize o app e tente de novo.';
  }
  return null;
}

// ---------- Ficha individual ----------

export function montarEnvelopeFicha(ficha, agora = new Date()) {
  const { id, ...dados } = ficha; // o id é local; quem importar recebe um id novo
  return { formato: FORMATO_FICHA, versao: VERSAO_FORMATO, exportadoEm: agora.toISOString(), personagem: dados };
}

export function validarEnvelopeFicha(texto) {
  const lido = interpretarJson(texto);
  if (!lido.ok) return lido;
  const env = lido.dados;
  if (!ehObjetoSimples(env) || env.formato !== FORMATO_FICHA) {
    if (ehObjetoSimples(env) && env.formato === FORMATO_BACKUP) {
      return { ok: false, erro: 'Este arquivo é um backup completo, não uma ficha. Use a restauração de backup.' };
    }
    return { ok: false, erro: 'Este arquivo não é uma ficha do DeadEssence.' };
  }
  const erroVersao = conferirVersao(env);
  if (erroVersao) return { ok: false, erro: erroVersao };
  if (!ehObjetoSimples(env.personagem)) return { ok: false, erro: 'O arquivo não contém os dados de um personagem.' };

  let personagem;
  try {
    personagem = limparDados(env.personagem);
  } catch (e) {
    return { ok: false, erro: e.message };
  }
  delete personagem.id;
  const nome = personagem[CAMPO_NOME];
  if (typeof nome !== 'string' || !nome.trim()) return { ok: false, erro: 'A ficha do arquivo não tem nome.' };
  return { ok: true, personagem };
}

// ---------- Backup completo ----------

export function montarEnvelopeBackup(dados, preferencias, agora = new Date()) {
  const env = { formato: FORMATO_BACKUP, versao: VERSAO_FORMATO, exportadoEm: agora.toISOString(), dados };
  if (preferencias) env.preferencias = preferencias;
  return env;
}

// storesPermitidas: nomes das listas de dados que o app realmente possui.
export function validarEnvelopeBackup(texto, storesPermitidas) {
  const lido = interpretarJson(texto);
  if (!lido.ok) return lido;
  const env = lido.dados;
  if (!ehObjetoSimples(env) || env.formato !== FORMATO_BACKUP) {
    if (ehObjetoSimples(env) && env.formato === FORMATO_FICHA) {
      return { ok: false, erro: 'Este arquivo é uma ficha individual, não um backup completo. Importe-o na lista de personagens.' };
    }
    return { ok: false, erro: 'Este arquivo não é um backup do DeadEssence.' };
  }
  const erroVersao = conferirVersao(env);
  if (erroVersao) return { ok: false, erro: erroVersao };
  if (!ehObjetoSimples(env.dados)) return { ok: false, erro: 'O backup não contém dados.' };

  let dados;
  let preferencias;
  try {
    dados = limparDados(env.dados);
    if (env.preferencias !== undefined) {
      if (!ehObjetoSimples(env.preferencias)) return { ok: false, erro: 'As preferências do backup estão em formato inválido.' };
      preferencias = limparDados(env.preferencias);
    }
  } catch (e) {
    return { ok: false, erro: e.message };
  }
  for (const [nome, registros] of Object.entries(dados)) {
    if (!storesPermitidas.includes(nome)) {
      return { ok: false, erro: `O backup contém dados que este app não reconhece ("${nome}").` };
    }
    if (!Array.isArray(registros) || !registros.every(ehObjetoSimples)) {
      return { ok: false, erro: `Os dados de "${nome}" estão em formato inválido.` };
    }
  }
  return { ok: true, dados, preferencias, exportadoEm: typeof env.exportadoEm === 'string' ? env.exportadoEm : null };
}