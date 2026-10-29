// Lógica pura das rolagens (sem React, sem banco): fácil de testar.
export const TIPOS_DADO = [4, 6, 8, 10, 12, 20];
export const LIMITE_DADOS = 10;
export const MAX_FLUXO = 2;
export const GRAUS_PROFICIENCIA = [
  { id: 'nenhuma', rotulo: 'Nenhuma', bonus: 0 },
  { id: 'fraco', rotulo: 'Fraco', bonus: 4 },
  { id: 'experiente', rotulo: 'Experiente', bonus: 8 },
  { id: 'avancado', rotulo: 'Avançado', bonus: 12 },
];

const inteiroEntre = (v, min, max, nome) => {
  if (!Number.isInteger(v) || v < min || v > max) throw new RangeError(`${nome} deve ser um número inteiro de ${min} a ${max}.`);
};
const somar = (lista) => lista.reduce((a, b) => a + b, 0);

// Sorteio sem viés (descarta valores que distorceriam o resto da divisão).
export function rolarDado(lados, aleatorio = globalThis.crypto) {
  if (!TIPOS_DADO.includes(lados)) throw new RangeError(`Dado inválido: D${lados}.`);
  const limite = Math.floor(0x100000000 / lados) * lados;
  const buffer = new Uint32Array(1);
  let x;
  do { aleatorio.getRandomValues(buffer); x = buffer[0]; } while (x >= limite);
  return (x % lados) + 1;
}

export function rolarVarios(lados, quantidade, aleatorio) {
  inteiroEntre(quantidade, 1, LIMITE_DADOS, 'A quantidade de dados');
  return Array.from({ length: quantidade }, () => rolarDado(lados, aleatorio));
}

export function rolagemLivre({ lados, quantidade, finalidade }, aleatorio) {
  const resultados = rolarVarios(lados, quantidade, aleatorio);
  return { tipo: 'livre', lados, quantidade, resultados, soma: somar(resultados), finalidade: finalidade?.trim() || null };
}

// Teste: cada D20 é rolado separado e o jogador escolhe qual usar (não há soma de D20).
export function rolagemTeste({ quantidade, fluxo, proficiencia, finalidade }, aleatorio) {
  inteiroEntre(fluxo, 0, MAX_FLUXO, 'Os pontos de Fluxo');
  const grau = GRAUS_PROFICIENCIA.find((g) => g.id === proficiencia);
  if (!grau) throw new RangeError('Proficiência inválida.');
  return {
    tipo: 'teste', lados: 20, quantidade,
    resultados: rolarVarios(20, quantidade, aleatorio),
    selecionado: null, // índice do D20 escolhido pelo jogador
    fluxo: { pontos: fluxo, resultados: fluxo > 0 ? rolarVarios(8, fluxo, aleatorio) : [] },
    proficiencia: grau.id, bonus: grau.bonus,
    finalidade: finalidade?.trim() || null,
  };
}

export const somaFluxo = (t) => somar(t.fluxo.resultados);

// Resultado = D20 escolhido + dados de Fluxo + bônus fixo de proficiência. Os D20 nunca são somados entre si.
export function totalDoTeste(t) {
  if (t.selecionado === null || t.selecionado === undefined) return null;
  return t.resultados[t.selecionado] + somaFluxo(t) + t.bonus;
}