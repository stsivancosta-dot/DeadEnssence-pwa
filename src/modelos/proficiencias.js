// Proficiências do DeadEssence: lista, graus, limites e cálculos. Lógica pura (sem React).
// Na ficha, só as proficiências TREINADAS são guardadas: { acrobacia: 'fraco', luta: 'avancado', ... }.

export const GRAUS = [
  { id: 'fraco', rotulo: 'Fraca', plural: 'fracas', bonus: 4, limite: 6, cor: '#2E71FF', textoSobre: '#FFFFFF' },
  { id: 'experiente', rotulo: 'Experiente', plural: 'experientes', bonus: 8, limite: 4, cor: '#EF724A', textoSobre: '#0A0E13' },
  { id: 'avancado', rotulo: 'Avançada', plural: 'avançadas', bonus: 12, limite: 2, cor: '#57E780', textoSobre: '#0A0E13' },
];

// A associação com os atributos é interna: organiza os dados e alimenta o gráfico.
export const GRUPOS = [
  { id: 'fisico', rotulo: 'Físico' },
  { id: 'intelecto', rotulo: 'Intelecto' },
  { id: 'presenca', rotulo: 'Presença' },
  { id: 'flexiveis', rotulo: 'Flexíveis' },
];

// Ordem alfabética (a da listagem).
export const PROFICIENCIAS = [
  { id: 'acrobacia', nome: 'Acrobacia', grupo: 'fisico' },
  { id: 'atletismo', nome: 'Atletismo', grupo: 'fisico' },
  { id: 'atualidades', nome: 'Atualidades', grupo: 'intelecto' },
  { id: 'ciencias', nome: 'Ciências', grupo: 'intelecto' },
  { id: 'diplomacia', nome: 'Diplomacia', grupo: 'presenca' },
  { id: 'enganacao', nome: 'Enganação', grupo: 'presenca' },
  { id: 'fortitude', nome: 'Fortitude', grupo: 'fisico' },
  { id: 'furtividade', nome: 'Furtividade', grupo: 'presenca' },
  { id: 'intimidacao', nome: 'Intimidação', grupo: 'presenca' },
  { id: 'intuicao', nome: 'Intuição', grupo: 'presenca' },
  { id: 'investigacao', nome: 'Investigação', grupo: 'intelecto' },
  { id: 'logica', nome: 'Lógica', grupo: 'intelecto' },
  { id: 'luta', nome: 'Luta', grupo: 'fisico' },
  { id: 'medicina', nome: 'Medicina', grupo: 'intelecto' },
  { id: 'percepcao', nome: 'Percepção', grupo: 'presenca' },
  { id: 'pontaria', nome: 'Pontaria', grupo: 'fisico' },
  { id: 'sobrevivencia', nome: 'Sobrevivência', grupo: 'flexiveis' },
  { id: 'tatica', nome: 'Tática', grupo: 'fisico' },
  { id: 'tecnologia', nome: 'Tecnologia', grupo: 'intelecto' },
  { id: 'vontade', nome: 'Vontade', grupo: 'flexiveis' },
];

export const grauPorId = (id) => GRAUS.find((g) => g.id === id) ?? null;

// Bônus de uma proficiência (0 se não treinada). Vale só para o resultado ESCOLHIDO no teste.
export const bonusDe = (treinadas, id) => grauPorId(treinadas?.[id])?.bonus ?? 0;

export function contagem(treinadas = {}) {
  const c = { fraco: 0, experiente: 0, avancado: 0 };
  for (const [id, grau] of Object.entries(treinadas)) {
    if (c[grau] !== undefined && PROFICIENCIAS.some((p) => p.id === id)) c[grau]++;
  }
  return c;
}

// novoGrau: id do grau, ou null para remover o treino.
// Mudar de grau libera a vaga antiga e ocupa a nova; no limite, a mudança é recusada e nada muda.
export function definirGrau(treinadas = {}, id, novoGrau) {
  if (!PROFICIENCIAS.some((p) => p.id === id)) return { ok: false, treinadas, motivo: 'Proficiência desconhecida.' };
  if (novoGrau === null) {
    const { [id]: _removida, ...resto } = treinadas;
    return { ok: true, treinadas: resto };
  }
  const grau = grauPorId(novoGrau);
  if (!grau) return { ok: false, treinadas, motivo: 'Classificação desconhecida.' };
  if (treinadas[id] === novoGrau) return { ok: true, treinadas };
  if (contagem(treinadas)[novoGrau] >= grau.limite) {
    return { ok: false, treinadas, motivo: `Limite de proficiências ${grau.plural} atingido (${grau.limite}/${grau.limite}). Remova ou altere uma delas para liberar a vaga.` };
  }
  return { ok: true, treinadas: { ...treinadas, [id]: novoGrau } };
}

// Soma dos bônus das proficiências treinadas por grupo, separada por grau (alimenta o gráfico).
export function somaPorGrupo(treinadas = {}) {
  return GRUPOS.map((grupo) => {
    const por = { fraco: 0, experiente: 0, avancado: 0 };
    for (const p of PROFICIENCIAS) {
      const grau = p.grupo === grupo.id ? grauPorId(treinadas[p.id]) : null;
      if (grau) por[grau.id] += grau.bonus;
    }
    return { ...grupo, por, total: por.fraco + por.experiente + por.avancado };
  });
}